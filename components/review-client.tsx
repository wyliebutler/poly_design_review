"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { MessageSquare, Clock, Send, Plus, Download, FileArchive, MapPin, Camera, X, History, Paperclip, FileText, Image as ImageIcon, ZoomIn } from "lucide-react";
import { useSession } from "next-auth/react";
import JSZip from "jszip";
import { postComment, uploadRevision, getComments, getFullProjectHistory } from "@/lib/actions";
import AuthorNameModal from "@/components/author-name-modal";
import { extractStlThumbnail } from "./thumbnail-extractor";


const StlViewer = dynamic(() => import("@/components/stl-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center tracking-widest text-xs font-black italic opacity-50">
      Loading 3D Engine...
    </div>
  )
});

interface ReviewClientProps {
  project: any;
  currentRevision: any;
}

// Helper to find adjacent revisions
const getAdjacentRevisionUrls = (currentRev: any, allRevisions: any[]) => {
  if (!currentRev || !allRevisions || allRevisions.length === 0) return [];
  const currentIndex = allRevisions.findIndex(r => r.id === currentRev.id);
  if (currentIndex === -1) return [];

  const urlsToPreload = [];
  // Next revision (newer)
  if (currentIndex > 0) urlsToPreload.push(allRevisions[currentIndex - 1].fileUrl);
  // Previous revision (older)
  if (currentIndex < allRevisions.length - 1) urlsToPreload.push(allRevisions[currentIndex + 1].fileUrl);
  
  return urlsToPreload;
};

export default function ReviewClient({ project, currentRevision: initialRevision }: ReviewClientProps) {
  const { data: session } = useSession();
  const isAdminUser = !!session;
  const [comment, setComment] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentRevision, setCurrentRevision] = useState(initialRevision);
  const [liveComments, setLiveComments] = useState<any[]>(initialRevision?.comments || []);
  const [projectRevisions, setProjectRevisions] = useState<any[]>(project.revisions || []);
  const [authorName, setAuthorName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number, y: number, z: number } | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{ x: number, y: number, z: number } | null>(null);
  const [snapshotFile, setSnapshotFile] = useState<File | null>(null);
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string, type: 'snapshot' | 'image' | 'document', name?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    // Logic for author identification
    if (session?.user?.name) {
      setAuthorName(session.user.name);
    } else {
      const savedName = localStorage.getItem("portal_author_name");
      if (savedName) {
        setAuthorName(savedName);
      } else {
        setShowNameModal(true);
      }
    }
  }, [session]);



  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveComments]);

  // Real-time live comments via Server-Sent Events (SSE)
  useEffect(() => {
    if (!currentRevision?.id) return;

    const eventSource = new EventSource(`/api/comments/stream?revisionId=${currentRevision.id}`);

    eventSource.onmessage = (event) => {
      try {
        const updatedComments = JSON.parse(event.data);
        setLiveComments(updatedComments);
      } catch (error) {
        console.error("Failed to parse SSE comment data:", error);
      }
    };

    eventSource.onerror = (error) => {
      // Typically, EventSource automatically reconnects. 
      // If we need custom fallback logic, handle it here.
      console.error("SSE connection error:", error);
    };

    // Teardown the persistent connection on unmount or revision change
    return () => {
      eventSource.close();
    };
  }, [currentRevision?.id]);

  // Real-time project revisions via Server-Sent Events (SSE)
  useEffect(() => {
    if (!project?.id) return;

    const eventSource = new EventSource(`/api/revisions/stream?projectId=${project.id}`);

    eventSource.onmessage = (event) => {
      try {
        const incomingRevisions = JSON.parse(event.data);
        if (Array.isArray(incomingRevisions)) {
           setProjectRevisions((prev) => {
              // Only update if we received more revisions than we currently hold,
              // or if we have zero to begin with. Assumes array is ordered desc by version.
              if (incomingRevisions.length > prev.length) {
                 return incomingRevisions;
              }
              return prev;
           });
        }
      } catch (error) {
        console.error("Failed to parse SSE revision data:", error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [project?.id]);


  const handleNameConfirm = (name: string) => {
    setAuthorName(name);
    localStorage.setItem("portal_author_name", name);
    setShowNameModal(false);
  };

  const formatTime = (dateStr: string) => {
    if (!mounted) return "...";
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "Invalid Date";
    }
  };

  const captureSnapshot = async () => {
    const container = document.getElementById('stl-viewer-container');
    if (container) {
      try {
        // Dynamically import again inside the function as a fallback to ensure it's loaded
        const html2canvasModule = (await import("html2canvas")).default;
        
        const canvas = await html2canvasModule(container, {
          backgroundColor: null, // preserve transparency if needed
          useCORS: true,         // Help with cross-origin images if any
          logging: false
        });

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `snapshot_${Date.now()}.png`, { type: "image/png" });
            setSnapshotFile(file);
            setSnapshotPreview(URL.createObjectURL(blob));
          }
        }, "image/png", 1.0);
      } catch (err) {
        console.error("Failed to capture screenshot with overlays:", err);
      }
    }
  };

  const removeSnapshot = () => {
    setSnapshotFile(null);
    if (snapshotPreview) {
      URL.revokeObjectURL(snapshotPreview);
      setSnapshotPreview(null);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentName(null);
  };

  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isDoc = file.type === 'application/pdf' || file.name.endsWith('.docx') || file.name.endsWith('.doc');

    if (!isImage && !isDoc) {
      alert("Only PDF, DOCX, PNG, and JPG files are supported.");
      return;
    }

    if (isImage) {
      // Resize image if it's too large
      try {
        const img = document.createElement('img');
        const url = URL.createObjectURL(file);
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });

        URL.revokeObjectURL(url);

        const MAX_DIMENSION = 1024;
        let { width, height } = img;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, { type: file.type });
              setAttachmentFile(resizedFile);
              setAttachmentName(file.name);
            }
          }, file.type, 0.9);
        } else {
             setAttachmentFile(file);
             setAttachmentName(file.name);
        }
      } catch (err) {
        console.error("Failed to resize image, using original", err);
        setAttachmentFile(file);
        setAttachmentName(file.name);
      }
    } else {
      // It's a document
      setAttachmentFile(file);
      setAttachmentName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || isPending || !currentRevision) return;

    setIsPending(true);
    
    try {
      const formData = new FormData();
      formData.append("revisionId", currentRevision.id);
      formData.append("content", comment);
      formData.append("isAuthorAdmin", String(isAdminUser));
      if (authorName) formData.append("authorName", authorName);
      if (selectedPoint) {
        formData.append("x", String(selectedPoint.x));
        formData.append("y", String(selectedPoint.y));
        formData.append("z", String(selectedPoint.z));
      }
      if (snapshotFile) {
        formData.append("snapshot", snapshotFile);
      }
      if (attachmentFile) {
        formData.append("attachment", attachmentFile);
      }

      const newComment = await postComment(formData);
      setLiveComments(prev => [...prev, newComment]);
      setComment("");
      setSelectedPoint(null);
      removeSnapshot();
      removeAttachment();
    } catch (error: any) {
      console.error("Failed to post comment:", error);
      alert("Failed to post comment: " + (error?.message || error));
    } finally {
      setIsPending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isPending) return;

    const formData = new FormData();
    formData.append("stlFile", file);

    setIsPending(true);
    
    // Attempt thumbnail generation in background
    try {
        const thumbnailFile = await extractStlThumbnail(file);
        if (thumbnailFile) {
            formData.append("thumbnail", thumbnailFile);
        }
    } catch (err) {
        console.error("Non-fatal error creating revision thumbnail: ", err);
    }

    try {
      const newRev = await uploadRevision(project.id, formData);
      setCurrentRevision(newRev);
      setLiveComments([]);
      setProjectRevisions((prev) => [newRev, ...prev]);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. STL files only.");
    } finally {
      setIsPending(false);
    }
  };

  const handleExportZip = async () => {
    setIsPending(true);
    try {
      const fullProject = await getFullProjectHistory(project.id);
      if (!fullProject) throw new Error("Failed to load project history");

      const zip = new JSZip();
      const safeProjectName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      let masterMd = `# Full Project Archive: ${project.name}\n\n`;
      masterMd += `*Exported on: ${new Date().toLocaleString()}*\n`;
      masterMd += `*Total Revisions: ${fullProject.revisions.length}*\n\n---\n\n`;

      // Use for...of to handle async fetches safely
      for (const rev of fullProject.revisions) {
        const revFolder = zip.folder(`REV_${rev.versionNumber}`);

        // 1. Generate Revision Markdown
        let revMd = `# Revision ${rev.versionNumber} Discussion\n\n`;
        revMd += `*Design Link: ${rev.fileName}*\n`;
        revMd += `*Uploaded: ${new Date(rev.createdAt).toLocaleString()}*\n\n---\n\n`;

        if (rev.comments.length === 0) {
          revMd += "*No discussion recorded for this revision.*\n";
        } else {
          for (const c of rev.comments) {
            let entry = `### **${c.authorName}** _(${new Date(c.createdAt).toLocaleString()})_\n${c.content}\n\n`;
            
            if (c.snapshotUrl) {
                try {
                    const snapResponse = await fetch(c.snapshotUrl);
                    if (snapResponse.ok) {
                        const snapBlob = await snapResponse.blob();
                        const snapFilename = `Snapshot_${c.id}.png`;
                        revFolder?.file(snapFilename, snapBlob);
                        entry += `![Snapshot](${snapFilename})\n\n`;
                    }
                } catch (err) {
                    console.error(`Failed to fetch snapshot ${c.snapshotUrl}`, err);
                    entry += `*(Failed to export attached snapshot)*\n\n`;
                }
            }

            if (c.attachmentUrl) {
                try {
                    const attachResponse = await fetch(c.attachmentUrl);
                    if (attachResponse.ok) {
                        const attachBlob = await attachResponse.blob();
                        const attachFilename = c.attachmentName || `Attachment_${c.id}`;
                        revFolder?.file(attachFilename, attachBlob);
                        entry += `*[Attachment: ${attachFilename}]*\n\n`;
                    }
                } catch (err) {
                    console.error(`Failed to fetch attachment ${c.attachmentUrl}`, err);
                    entry += `*(Failed to export attachment)*\n\n`;
                }
            }

            revMd += entry;
            masterMd += `## [REV ${rev.versionNumber}] ${entry}`;
          }
        }

        revFolder?.file(`discussion_v${rev.versionNumber}.md`, revMd);

        // 2. Fetch and Attach the STL File
        try {
          const stlResponse = await fetch(rev.fileUrl);
          if (stlResponse.ok) {
            const stlBlob = await stlResponse.blob();
            // Try to use original filename but fallback to standardized name
            const stlFilename = rev.fileUrl.split('/').pop() || `${safeProjectName}_rev_${rev.versionNumber}.stl`;
            revFolder?.file(stlFilename, stlBlob);
          } else {
            revFolder?.file(`ERROR_FETCHING_STL.txt`, `The system could not fetch the model from ${rev.fileUrl}`);
          }
        } catch (err) {
          console.error(`Error fetching STL for REV ${rev.versionNumber}:`, err);
          revFolder?.file(`ERROR_FETCHING_STL.txt`, `Network error while fetching the model.`);
        }
      }

      zip.file(`FULL_PROJECT_HISTORY.md`, masterMd);

      // 3. Generate and Download
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeProjectName}_full_history_archive.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Full project export failed:", error);
      alert("Failed to generate full project archive.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 text-slate-900">
      
      {/* LEFT SIDEBAR: Revision History */}
      <div className="w-72 border-r-2 border-slate-300 flex flex-col bg-white shadow-xl z-20">
        <div className="p-6 border-b-2 border-slate-200 flex items-center justify-between shadow-sm">
          <h2 className="text-sm font-black uppercase italic tracking-widest flex items-center gap-2 text-slate-800">
            <History className="h-4 w-4 text-poly-teal-light" /> History
          </h2>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-2 relative">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">
              Revisions ({projectRevisions.length})
          </div>
          {projectRevisions.map((rev: any) => (
            <button
              key={rev.id}
              onClick={() => {
                setCurrentRevision(rev);
                setLiveComments(rev.comments || []);
              }}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all flex flex-col group ${
                currentRevision?.id === rev.id 
                  ? 'bg-poly-teal-light/10 border-poly-teal-light/30 shadow-sm' 
                  : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className={`text-xs font-black tracking-widest ${currentRevision?.id === rev.id ? 'text-poly-teal-dark' : 'text-slate-700'}`}>
                  REV {rev.versionNumber}
                </span>
                {currentRevision?.id === rev.id && (
                  <span className="w-2 h-2 rounded-full bg-poly-teal-light animate-pulse shadow-[0_0_8px_rgba(92,184,146,0.8)]" />
                )}
              </div>
              <span className={`text-[10px] font-bold mt-1 ${currentRevision?.id === rev.id ? 'text-poly-teal-dark/70' : 'text-slate-400 group-hover:text-slate-500'}`}>
                {new Date(rev.createdAt).toLocaleDateString()} at {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* CENTER: 3D Viewer */}
      <div className="flex-grow relative h-full">
        <div className="absolute top-8 left-8 z-10 space-y-4 pointer-events-none">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter leading-none flex items-center gap-3 text-slate-900 drop-shadow-md">
              {project.name}
              <span className="text-poly-teal-dark flex items-center gap-1 group">
                _REV_{currentRevision?.versionNumber || 0}
              </span>
            </h1>
            <p className="text-[10px] font-black tracking-widest text-slate-500 mt-2 drop-shadow-md bg-white/50 backdrop-blur-sm inline-block px-2 py-1 rounded-md">
              Design Review Session
            </p>
          </div>
        </div>

        {currentRevision ? (
          <div id="stl-viewer-container" className="flex-1 relative overflow-hidden h-full rounded-2xl shadow-inner border border-slate-200">
          <StlViewer 
            key={currentRevision.id}
            url={currentRevision?.fileUrl}
            preloadUrls={getAdjacentRevisionUrls(currentRevision, projectRevisions)}
            comments={liveComments}
            onPointSelected={setSelectedPoint}
            selectedPoint={selectedPoint}
            cameraTarget={cameraTarget}
          />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center uppercase tracking-widest text-xs font-black italic opacity-50">
            No 3D Models Uploaded
          </div>
        )}

        {isAdminUser && (
          <div className="absolute bottom-8 left-8 z-10 transition-all">
            <label className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-black italic tracking-widest text-[10px] transition-all cursor-pointer group shadow-sm rounded-xl">
              <Plus className="h-3 w-3 text-poly-teal-dark group-hover:scale-125 transition-transform" />
              Upload New Revision
              <input
                type="file"
                className="hidden"
                accept=".stl"
                onChange={handleFileUpload}
                disabled={isPending}
              />
            </label>
          </div>
        )}
      </div>

      <div className="w-96 border-l-2 border-slate-300 flex flex-col bg-white shadow-xl z-20">
        <div className="p-6 border-b-2 border-slate-200 flex items-center justify-between shadow-sm">
          <h2 className="text-sm font-black italic tracking-widest flex items-center gap-2 text-slate-800">
            <MessageSquare className="h-4 w-4 text-poly-teal-light" /> Discussion
          </h2>
          {isAdminUser && (
            <button
              onClick={handleExportZip}
              disabled={isPending}
              className="text-slate-400 hover:text-poly-teal-dark transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
              title="Export Discussion & STL Archive"
            >
              {isPending ? <Clock className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />} Export .ZIP
            </button>
          )}
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-2 flex flex-col">
          {liveComments?.map((comment: any, index: number) => {
            const isMe = comment.authorName === authorName;
            
            return (
              <div key={comment.id} className={`flex w-full animate-in fade-in slide-in-from-bottom-2 group/comment border-b border-slate-200/60 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col max-w-[95%] ${isMe ? 'items-end' : 'items-start'}`}>
                  
                  {/* Inline Message Body */}
                  <div className={`relative flex items-start gap-1.5 text-xs outline-none leading-relaxed text-left break-words w-full ${isMe ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                      <div className={`font-black tracking-wider whitespace-nowrap pt-0.5 ${comment.authorName === 'Admin' ? 'text-poly-teal-dark' : isMe ? 'text-poly-indigo' : 'text-slate-500'}`}>
                        {comment.x !== null && (
                          <span className="inline-flex bg-poly-indigo text-white w-3.5 h-3.5 rounded-full items-center justify-center text-[7px] mr-1 align-text-top mt-0.5">
                            {index + 1}
                          </span>
                        )}
                        {comment.authorName}:
                      </div>
                      <div className={`font-medium whitespace-pre-wrap ${isMe ? 'text-slate-800' : 'text-slate-600'}`}>
                        {comment.content}
                      </div>

                    {comment.x !== null && (
                      <button 
                        onClick={() => setCameraTarget({ x: comment.x, y: comment.y, z: comment.z })}
                        className="text-poly-teal-dark bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:text-white hover:bg-poly-teal-dark hover:scale-110 opacity-0 group-hover/comment:opacity-100 transition-all ml-1 flex-shrink-0"
                        title={`Fly to Pin at [${comment.x.toFixed(1)}, ${comment.y.toFixed(1)}, ${comment.z.toFixed(1)}]`}
                      >
                        <MapPin className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  
                  {/* Media Metadata */}
                  <div className={`flex flex-col gap-1.5 mt-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    {comment.snapshotUrl && (
                      <div 
                        className="cursor-zoom-in relative group/media inline-block"
                        onClick={() => setSelectedMedia({ url: comment.snapshotUrl, type: 'snapshot' })}
                      >
                         <img 
                              src={comment.snapshotUrl} 
                              alt="Visual Snapshot" 
                              className="w-48 rounded-md border border-slate-200 transition-opacity shadow-sm group-hover/media:opacity-90"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                              <ZoomIn className="text-white w-6 h-6 shadow-sm" />
                          </div>
                      </div>
                    )}
                    
                    {comment.attachmentUrl && (
                      <div className="mt-1">
                        {comment.attachmentUrl.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                          <div 
                            className="cursor-zoom-in relative group/media inline-block"
                            onClick={() => setSelectedMedia({ url: comment.attachmentUrl, type: 'image', name: comment.attachmentName })}
                          >
                             <img 
                                src={comment.attachmentUrl} 
                                alt={comment.attachmentName || "Attached Image"} 
                                className="w-48 rounded-md border border-slate-200 transition-opacity shadow-sm group-hover/media:opacity-90"
                             />
                             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                 <ZoomIn className="text-white w-6 h-6 shadow-sm" />
                             </div>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-poly-teal-light/5 hover:border-poly-teal-light/30 transition-colors shadow-sm max-w-xs"
                            onClick={() => setSelectedMedia({ url: comment.attachmentUrl, type: 'document', name: comment.attachmentName })}
                          >
                            <FileText className="w-5 h-5 text-poly-indigo flex-shrink-0" />
                            <span className="text-xs font-medium text-slate-700 truncate" title={comment.attachmentName}>
                              {comment.attachmentName || "Document"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <span className="text-[9px] text-slate-400 font-medium">
                      {comment.createdAt ? formatTime(comment.createdAt) : "Pending"}
                    </span>
                  </div>

                </div>
              </div>
            );
          })}
          {liveComments?.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-12">
              <MessageSquare className="h-12 w-12 mb-4" />
              <p className="text-[10px] font-black tracking-[0.2em]">Zero Discussion Activity</p>
              <p className="text-[8px] font-bold mt-2">Initiate the feedback loop by posting a comment below.</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t-2 border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
          <form className="relative space-y-3" onSubmit={handleSubmit}>
            
            {snapshotPreview && (
              <div className="relative inline-block animate-in fade-in slide-in-from-bottom-2">
                  <div className="text-[10px] font-black tracking-widest text-slate-500 mb-1 flex items-center gap-1">
                      <Camera className="w-3 h-3" /> Staged Snapshot
                  </div>
                  <div className="relative w-32 rounded-lg border-2 border-poly-teal-light overflow-hidden shadow-sm">
                      <img src={snapshotPreview} alt="Staged Snapshot" className="w-full h-auto object-cover" />
                      <button 
                          type="button" 
                          onClick={removeSnapshot}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:scale-110 transition-transform"
                      >
                          <X className="w-3 h-3" />
                      </button>
                  </div>
              </div>
            )}

            {attachmentName && (
               <div className="relative inline-block animate-in fade-in slide-in-from-bottom-2 mt-2">
                  <div className="text-[10px] font-black tracking-widest text-slate-500 mb-1 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> Staged Attachment
                  </div>
                  <div className="relative flex items-center gap-2 bg-slate-50 border-2 border-poly-indigo rounded-lg p-2 pr-8 shadow-sm">
                      {attachmentName.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                         <ImageIcon className="w-4 h-4 text-poly-indigo" />
                      ) : (
                         <FileText className="w-4 h-4 text-poly-indigo" />
                      )}
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">
                         {attachmentName}
                      </span>
                      <button 
                          type="button" 
                          onClick={removeAttachment}
                          className="absolute right-2 bg-red-500 text-white rounded-full p-0.5 hover:scale-110 transition-transform"
                      >
                          <X className="w-3 h-3" />
                      </button>
                  </div>
               </div>
            )}

            <div className="flex justify-between items-center px-1">
                {(selectedPoint || snapshotFile) ? (
                    <div className="flex gap-2">
                        {selectedPoint && (
                            <div className="bg-poly-indigo text-white text-[10px] font-black tracking-widest px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Pin Attached
                            <button type="button" onClick={() => setSelectedPoint(null)} className="ml-1 hover:text-red-300">×</button>
                            </div>
                        )}
                        {snapshotFile && (
                            <div className="bg-slate-800 text-white text-[10px] font-black tracking-widest px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                            <Camera className="h-3 w-3" /> Snapshot
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-[10px] uppercase font-bold text-slate-400 italic tracking-widest">
                        Drafting Feedback...
                    </div>
                )}

                <div className="flex gap-2">
                  <button 
                      type="button" 
                      onClick={captureSnapshot}
                      disabled={isPending}
                      className="text-[10px] font-black tracking-widest text-poly-teal-dark hover:text-poly-teal-light transition-colors flex items-center gap-1 px-2 py-1 border border-transparent hover:border-poly-teal-light/20 rounded-md bg-poly-teal-light/5 hover:bg-poly-teal-light/10"
                      title="Capture what is currently visible in the 3D Viewer"
                  >
                      <Camera className="w-3 h-3" /> Attach Snapshot
                  </button>
                  
                  <label className="text-[10px] font-black tracking-widest text-poly-indigo hover:text-poly-indigo/70 transition-colors flex items-center gap-1 px-2 py-1 border border-transparent hover:border-poly-indigo/20 rounded-md bg-poly-indigo/5 hover:bg-poly-indigo/10 cursor-pointer">
                      <Paperclip className="w-3 h-3" /> Add File
                      <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.docx,.doc,image/png,image/jpeg,image/jpg" 
                          onChange={handleAttachmentSelect}
                          disabled={isPending}
                      />
                  </label>
                </div>
            </div>

            <div className="relative">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isPending}
                placeholder={selectedPoint ? "Describe the pinned location..." : "Your feedback..."}
                className={`w-full bg-slate-50 border-2 p-4 pb-12 text-xs font-medium text-slate-800 focus:ring-2 outline-none min-h-[100px] resize-none disabled:opacity-50 placeholder:opacity-40 rounded-xl shadow-inner transition-all ${
                  selectedPoint 
                    ? "border-poly-indigo focus:ring-poly-indigo focus:border-poly-indigo" 
                    : "border-slate-300 focus:ring-poly-teal-light focus:border-poly-teal-light"
                }`}
              />
              <button
                type="submit"
                disabled={isPending || !comment.trim()}
                className="absolute bottom-4 right-4 text-poly-teal-light p-2 disabled:opacity-50 hover:scale-110 hover:text-poly-teal-dark transition-all bg-white rounded-lg shadow-sm border border-slate-100 disabled:shadow-none disabled:bg-transparent disabled:border-transparent"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div >

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
            <button 
                onClick={() => setSelectedMedia(null)}
                className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all hover:scale-110 z-10"
            >
                <X className="w-8 h-8" />
            </button>
            <div className="relative w-full h-full flex flex-col items-center justify-center">
                {(selectedMedia.type === 'snapshot' || selectedMedia.type === 'image') && (
                    <img 
                        src={selectedMedia.url} 
                        alt="Enlarged View" 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        style={{ cursor: 'zoom-out' }}
                        onClick={() => setSelectedMedia(null)}
                    />
                )}
                {selectedMedia.type === 'document' && (selectedMedia.name?.match(/\.pdf$/i) || selectedMedia.url.match(/\.pdf/i)) && (
                    <embed 
                        src={`/api/pdf?url=${encodeURIComponent(selectedMedia.url)}#toolbar=0&navpanes=0&scrollbar=0`} 
                        type="application/pdf"
                        className="w-full h-full max-w-5xl rounded-lg shadow-2xl bg-white" 
                    />
                )}
                {selectedMedia.type === 'document' && !(selectedMedia.name?.match(/\.pdf$/i) || selectedMedia.url.match(/\.pdf/i)) && (
                    <div className="w-full max-w-2xl bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col">
                        <div className="flex-grow flex flex-col items-center justify-center p-12 text-center bg-slate-50">
                            <FileText className="w-24 h-24 text-slate-300 mb-4" />
                            <h3 className="text-lg font-black text-slate-700 mb-2">Preview Not Available</h3>
                            <p className="text-sm font-medium text-slate-500 mb-6">DOCX and other binary files cannot be previewed natively in the browser.</p>
                            <a 
                                href={selectedMedia.url} 
                                download 
                                className="bg-poly-indigo text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-poly-indigo/90 transition-all flex items-center gap-2 hover:scale-105"
                            >
                                <Download className="w-5 h-5" /> Download {selectedMedia.name || 'File'}
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {showNameModal && <AuthorNameModal onConfirm={handleNameConfirm} />}
    </div >
  );
}
