"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Link as LinkIcon, Eye, Archive, Trash2, Check, RefreshCw, Box } from "lucide-react";
import { archiveProject, unarchiveProject, deleteProject } from "@/lib/actions";
import EditProjectModal from "@/components/edit-project-modal";

interface ProjectListProps {
  projects: any[];
}

export default function ProjectList({ projects = [] }: ProjectListProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleArchive = async (id: string, isArchived: boolean) => {
    if (isPending) return;
    setIsPending(id);
    try {
      if (isArchived) {
        await unarchiveProject(id);
      } else {
        await archiveProject(id);
      }
    } catch (err) {
      alert("Failed to update project status");
    } finally {
      setIsPending(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (isPending) return;
    if (!confirm("Are you sure? This will delete all revisions and files permanently.")) return;

    setIsPending(id);
    try {
      await deleteProject(id);
    } catch (err) {
      alert("Failed to delete project");
    } finally {
      setIsPending(null);
    }
  };

  const copyLink = (obfuscatedId: string) => {
    const url = `${window.location.origin}/review/${obfuscatedId}`;

    const onSuccess = () => {
      setCopiedId(obfuscatedId);
      setTimeout(() => setCopiedId(null), 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(onSuccess).catch(() => {
        prompt("Copy portal URL:", url);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        onSuccess();
      } catch (err) {
        prompt("Copy portal URL:", url);
      }
      document.body.removeChild(textArea);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!mounted) return "...";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <div key={project.id} className={`border p-6 backdrop-blur-sm group transition-all rounded-3xl ${project.isArchived ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-poly-teal-light hover:shadow-lg overflow-hidden'}`}>
          <div 
            className="relative h-48 mb-6 border border-slate-200 rounded-2xl overflow-hidden group-hover:border-poly-teal-light/50 transition-colors bg-white flex items-center justify-center"
          >
            {project.revisions[0] && project.revisions[0].thumbnailUrl ? (
              <img 
                 src={project.revisions[0].thumbnailUrl} 
                 alt={`Thumbnail for ${project.name}`}
                 className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-700" 
              />
            ) : project.revisions[0] ? (
              <div className="flex flex-col items-center justify-center h-full w-full bg-[#f0fdf4] text-poly-teal-dark">
                 <Box className="h-12 w-12 mb-2 opacity-50" />
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Generating Thumbnail...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 text-slate-400">
                <Box className="h-12 w-12 mb-2 opacity-50" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">No Model Data</span>
              </div>
            )}

            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              {project.isArchived && (
                <span className="text-[8px] font-black bg-slate-700 px-2 py-0.5 uppercase tracking-widest text-white rounded-full">Archived</span>
              )}
              <span className="text-[8px] font-black bg-white/90 backdrop-blur-md border border-slate-200 px-2 py-0.5 uppercase tracking-widest text-poly-teal-dark rounded-full w-fit">
                REV {project.revisions[0]?.versionNumber || 0}
              </span>
            </div>

            <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => copyLink(project.obfuscatedId)}
                className="p-2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full hover:bg-poly-teal-light hover:text-white hover:border-poly-teal-light text-slate-600 transition-all"
                title="Copy Link"
              >
                {copiedId === project.obfuscatedId ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <LinkIcon className="h-3 w-3" />
                )}
              </button>
              <Link
                href={`/review/${project.obfuscatedId}`}
                target="_blank"
                className="p-2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full hover:bg-poly-teal-light hover:text-white hover:border-poly-teal-light text-slate-600 transition-all"
                title="Open Review"
              >
                <Eye className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="flex items-start justify-between mt-4">
            <div className="min-w-0 flex-grow pr-4">
              <h3 className="text-lg font-bold uppercase italic transition-colors text-slate-800 group-hover:text-poly-teal-dark break-words">{project.name}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-3">
                {project.description || "No description provided."}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <EditProjectModal project={project} />
              <button
                onClick={() => handleArchive(project.id, project.isArchived)}
                disabled={!!isPending}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-poly-teal-dark transition-all rounded-full disabled:opacity-50"
                title={project.isArchived ? "Unarchive Project" : "Archive Project"}
              >
                {isPending === project.id ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => handleDelete(project.id)}
                disabled={!!isPending}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-all rounded-full disabled:opacity-50"
                title="Delete Project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Rev {project.revisions[0]?.versionNumber || 0}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {formatDate(project.createdAt)}
            </span>
          </div>
        </div>
      ))}

      {projects.length === 0 && (
        <div className="col-span-full border-2 border-dashed border-slate-200 rounded-3xl p-24 text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 italic">No projects found. Initiate a new design review to begin.</p>
        </div>
      )}
    </div>
  );
}

