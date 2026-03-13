"use client";

import React, { useRef, useEffect } from "react";
import { MessageSquare, Clock, FileArchive, MapPin, ZoomIn, FileText, Camera, Paperclip, X, Send, ImageIcon, Download } from "lucide-react";
import type { Comment } from "@prisma/client";

interface DiscussionSidebarProps {
  isAdminUser: boolean;
  isPending: boolean;
  liveComments: Comment[];
  authorName: string;
  snapshotPreview: string | null;
  snapshotFile: File | null;
  attachmentName: string | null;
  selectedPoint: { x: number, y: number, z: number } | null;
  comment: string;
  setComment: (c: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleExportZip: () => void;
  setCameraTarget: (target: { x: number, y: number, z: number }) => void;
  setSelectedMedia: (media: { url: string, type: 'snapshot' | 'image' | 'document', name?: string }) => void;
  removeSnapshot: () => void;
  removeAttachment: () => void;
  setSelectedPoint: (p: null) => void;
  captureSnapshot: () => void;
  handleAttachmentSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DiscussionSidebar({
  isAdminUser,
  isPending,
  liveComments,
  authorName,
  snapshotPreview,
  snapshotFile,
  attachmentName,
  selectedPoint,
  comment,
  setComment,
  handleSubmit,
  handleExportZip,
  setCameraTarget,
  setSelectedMedia,
  removeSnapshot,
  removeAttachment,
  setSelectedPoint,
  captureSnapshot,
  handleAttachmentSelect
}: DiscussionSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const prevCommentsLengthRef = useRef(0);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    const currentLength = liveComments?.length || 0;
    
    // Auto-scroll only on initial paint with comments, OR when new comments are appended.
    // This prevents SSE state refreshes from unexpectedly jumping the user's scroll position.
    if (!initialScrollDone.current || currentLength > prevCommentsLengthRef.current) {
      if (currentLength > 0) {
        initialScrollDone.current = true;
      }
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
      prevCommentsLengthRef.current = currentLength;
      return () => clearTimeout(timer);
    }
    
    prevCommentsLengthRef.current = currentLength;
  }, [liveComments]);

  const pinnedComments = React.useMemo(() => {
    return liveComments?.filter(c => c.x !== null && c.y !== null && c.z !== null) || [];
  }, [liveComments]);

  const formatTime = (dateStr: string | Date | undefined) => {
    if (!dateStr) return '';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
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
        {liveComments?.map((c) => {
          const isMe = c.authorName === authorName;
          const hasPin = c.x !== null && c.y !== null && c.z !== null;
          const pinNumber = hasPin ? pinnedComments.findIndex(pc => pc.id === c.id) + 1 : null;
          
          return (
            <div key={c.id} className={`flex w-full animate-in fade-in slide-in-from-bottom-2 group/comment border-b border-slate-300 pb-4 mb-4 last:border-0 last:pb-0 last:mb-0 ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col max-w-[95%] ${isMe ? 'items-end' : 'items-start'}`}>
                
                {/* Inline Message Body */}
                <div className={`relative flex items-start gap-1.5 text-xs outline-none leading-relaxed text-left break-words w-full ${isMe ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                    <div className={`font-black tracking-wider whitespace-nowrap pt-0.5 ${c.authorName === 'Admin' ? 'text-poly-teal-dark' : isMe ? 'text-poly-indigo' : 'text-slate-500'}`}>
                      {hasPin && (
                        <span className="inline-flex bg-poly-indigo text-white w-3.5 h-3.5 rounded-full items-center justify-center text-[7px] mr-1 align-text-top mt-0.5">
                          {pinNumber}
                        </span>
                      )}
                      {c.authorName}:
                    </div>
                    <div className={`font-medium whitespace-pre-wrap ${isMe ? 'text-slate-800' : 'text-slate-600'}`}>
                      {c.content}
                    </div>

                  {c.x !== null && (
                    <button 
                      onClick={() => setCameraTarget({ x: c.x as number, y: c.y as number, z: c.z as number })}
                      className="text-poly-teal-dark bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:text-white hover:bg-poly-teal-dark hover:scale-110 opacity-0 group-hover/comment:opacity-100 transition-all ml-1 flex-shrink-0"
                      title={`Fly to Pin at [${(c.x as number).toFixed(1)}, ${(c.y as number).toFixed(1)}, ${(c.z as number).toFixed(1)}]`}
                    >
                      <MapPin className="h-3 w-3" />
                    </button>
                  )}
                </div>
                
                {/* Media Metadata */}
                <div className={`flex flex-col gap-1.5 mt-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  {c.snapshotUrl && (
                    <div 
                      className="cursor-zoom-in relative group/media inline-block"
                      onClick={() => setSelectedMedia({ url: c.snapshotUrl!, type: 'snapshot' })}
                    >
                       <img 
                            src={c.snapshotUrl} 
                            alt="Visual Snapshot" 
                            className="w-48 rounded-md border border-slate-200 transition-opacity shadow-sm group-hover/media:opacity-90"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                            <ZoomIn className="text-white w-6 h-6 shadow-sm" />
                        </div>
                    </div>
                  )}
                  
                  {c.attachmentUrl && (
                    <div className="mt-1">
                      {c.attachmentUrl.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                        <div 
                          className="cursor-zoom-in relative group/media inline-block"
                          onClick={() => setSelectedMedia({ url: c.attachmentUrl!, type: 'image', name: c.attachmentName || undefined })}
                        >
                           <img 
                              src={c.attachmentUrl} 
                              alt={c.attachmentName || "Attached Image"} 
                              className="w-48 rounded-md border border-slate-200 transition-opacity shadow-sm group-hover/media:opacity-90"
                           />
                           <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                               <ZoomIn className="text-white w-6 h-6 shadow-sm" />
                           </div>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-poly-teal-light/5 hover:border-poly-teal-light/30 transition-colors shadow-sm max-w-xs"
                          onClick={() => setSelectedMedia({ url: c.attachmentUrl!, type: 'document', name: c.attachmentName || undefined })}
                        >
                          <FileText className="w-5 h-5 text-poly-indigo flex-shrink-0" />
                          <span className="text-xs font-medium text-slate-700 truncate" title={c.attachmentName || undefined}>
                            {c.attachmentName || "Document"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <span className="text-[9px] text-slate-400 font-medium">
                    {c.createdAt ? formatTime(c.createdAt) : "Pending"}
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
    </div>
  );
}
