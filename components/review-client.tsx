"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { MessageSquare, Clock, Send, Plus, Download, FileArchive, MapPin, Camera, X, History, Paperclip, FileText, Image as ImageIcon, ZoomIn } from "lucide-react";
import { useSession } from "next-auth/react";
import JSZip from "jszip";
import { postComment, uploadRevision, getComments, getFullProjectHistory } from "@/lib/actions";
import type { ProjectWithRevisions, RevisionWithComments } from "@/lib/actions";
import type { Comment } from "@prisma/client";
import AuthorNameModal from "@/components/author-name-modal";
import { HistorySidebar } from "@/components/history-sidebar";
import { DiscussionSidebar } from "@/components/discussion-sidebar";
import { extractStlThumbnail } from "./thumbnail-extractor";
import { toast } from "sonner";


const StlViewer = dynamic(() => import("@/components/stl-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center tracking-widest text-xs font-black italic opacity-50">
      Loading 3D Engine...
    </div>
  )
});

interface ReviewClientProps {
  project: ProjectWithRevisions;
  currentRevision: RevisionWithComments;
}

// Helper to find adjacent revisions
const getAdjacentRevisionUrls = (currentRev: RevisionWithComments, allRevisions: RevisionWithComments[]) => {
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
  const [currentRevision, setCurrentRevision] = useState<RevisionWithComments>(initialRevision);
  const [liveComments, setLiveComments] = useState<Comment[]>(initialRevision?.comments || []);
  const [projectRevisions, setProjectRevisions] = useState<RevisionWithComments[]>(project.revisions || []);
  const [authorName, setAuthorName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number, y: number, z: number } | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{ x: number, y: number, z: number } | null>(null);
  const [snapshotFile, setSnapshotFile] = useState<File | null>(null);
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string, type: 'snapshot' | 'image' | 'document', name?: string } | null>(null);
  const highestKnownVersion = useRef<number>(initialRevision?.versionNumber || 0);

  const handlePointSelected = React.useCallback((point: { x: number, y: number, z: number } | null) => {
    setSelectedPoint(point);
  }, []);

  const sortedLiveComments = React.useMemo(() => {
    return [...liveComments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [liveComments]);

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
        if (Array.isArray(incomingRevisions) && incomingRevisions.length > 0) {
           const latest = incomingRevisions[0];

           setProjectRevisions((prev) => {
              if (incomingRevisions.length > prev.length) {
                 return incomingRevisions;
              }
              return prev;
           });

           // Auto-switch to newest revision ONLY IF it's genuinely newer than any we've seen before
           if (latest.versionNumber > highestKnownVersion.current) {
              highestKnownVersion.current = latest.versionNumber;
              
              setCurrentRevision(() => {
                 toast.info(`New Revision ${latest.versionNumber} uploaded! Switching view...`);
                 // Defer the comment update slightly to ensure state batches correctly
                 setTimeout(() => setLiveComments(latest.comments || []), 0);
                 return latest;
              });
           }
        }
      } catch (error) {
        // SSE Revision Parse Error
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

  const removeSnapshot = React.useCallback(() => {
    setSnapshotFile(null);
    if (snapshotPreview) {
      URL.revokeObjectURL(snapshotPreview);
      setSnapshotPreview(null);
    }
  }, [snapshotPreview]);

  const removeAttachment = React.useCallback(() => {
    setAttachmentFile(null);
    setAttachmentName(null);
  }, []);

  const handleAttachmentSelect = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isDoc = file.type === 'application/pdf' || file.name.endsWith('.docx') || file.name.endsWith('.doc') || file.name.endsWith('.txt');

    if (!isImage && !isDoc) {
      toast.error("Invalid File Type", { description: "Only PDF, DOCX, TXT, PNG, and JPG files are supported." });
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
  }, []);

  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
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

      const result = await postComment(formData);
      
      if (result && "error" in result) {
        toast.error("Upload Failed", { description: result.error });
        return;
      }
      
      setLiveComments(prev => [...prev, result as Comment]);
      setComment("");
      setSelectedPoint(null);
      removeSnapshot();
      removeAttachment();
      toast.success("Comment Posted");
    } catch (error: any) {
      console.error("Failed to post comment:", error);
      toast.error("Upload Failed", { description: error?.message || String(error) });
    } finally {
      setIsPending(false);
    }
  }, [comment, isPending, currentRevision, isAdminUser, authorName, selectedPoint, snapshotFile, attachmentFile, removeSnapshot, removeAttachment]);

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
      const result = await uploadRevision(project.id, formData);
      
      if (result && "error" in result) {
        toast.error("Upload Failed", { description: result.error });
        return;
      }

      const newRev: RevisionWithComments = { ...(result as RevisionWithComments), comments: [] };
      setCurrentRevision(newRev);
      setLiveComments([]);
      setProjectRevisions((prev) => [newRev, ...prev]);
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error("Upload Failed", { description: error?.message || "STL files only." });
    } finally {
      setIsPending(false);
    }
  };

  const handleExportZip = React.useCallback(async () => {
    setIsPending(true);
    try {
      const fullProject = await getFullProjectHistory(project.id);
      if (!fullProject) throw new Error("Failed to load project history");
      if ("error" in fullProject) throw new Error(fullProject.error);

      if (!("revisions" in fullProject)) {
        throw new Error("Invalid project data returned from server");
      }

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
      toast.error("Export Failed", { description: "Failed to generate full project archive." });
    } finally {
      setIsPending(false);
    }
  }, [project, isAdminUser, projectRevisions]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 text-slate-900">
      
      {/* LEFT SIDEBAR: Revision History */}
      <HistorySidebar 
        projectRevisions={projectRevisions}
        currentRevision={currentRevision}
        onSelectRevision={React.useCallback((rev: RevisionWithComments) => {
          setCurrentRevision(rev);
          setLiveComments(rev.comments || []);
        }, [])}
      />

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
            comments={sortedLiveComments}
            onPointSelected={handlePointSelected}
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

      <DiscussionSidebar
        isAdminUser={isAdminUser}
        isPending={isPending}
        liveComments={sortedLiveComments}
        authorName={authorName}
        snapshotPreview={snapshotPreview}
        snapshotFile={snapshotFile}
        attachmentName={attachmentName}
        selectedPoint={selectedPoint}
        comment={comment}
        setComment={setComment}
        handleSubmit={handleSubmit}
        handleExportZip={handleExportZip}
        setCameraTarget={setCameraTarget}
        setSelectedMedia={setSelectedMedia as any}
        removeSnapshot={removeSnapshot}
        removeAttachment={removeAttachment}
        setSelectedPoint={setSelectedPoint as any}
        captureSnapshot={captureSnapshot}
        handleAttachmentSelect={handleAttachmentSelect}
      />

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
