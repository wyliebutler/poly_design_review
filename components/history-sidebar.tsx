"use client";

import React from "react";
import { History } from "lucide-react";
import type { RevisionWithComments } from "@/lib/actions";

interface HistorySidebarProps {
  projectRevisions: RevisionWithComments[];
  currentRevision: RevisionWithComments | null;
  onSelectRevision: (rev: RevisionWithComments) => void;
}

export function HistorySidebar({
  projectRevisions,
  currentRevision,
  onSelectRevision,
}: HistorySidebarProps) {
  return (
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
        {projectRevisions.map((rev) => (
          <button
            key={rev.id}
            onClick={() => onSelectRevision(rev)}
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
  );
}
