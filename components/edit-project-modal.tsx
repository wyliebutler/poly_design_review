"use client";

import { useState } from "react";
import { Edit2, X, Loader2 } from "lucide-react";
import { updateProject } from "@/lib/actions";

interface EditProjectModalProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    notificationEmail: string | null;
  };
}

export default function EditProjectModal({ project }: EditProjectModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);

    try {
      await updateProject(project.id, formData);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update project:", error);
      alert("Failed to update project. Check console for details.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-slate-100 text-slate-400 hover:text-poly-teal-dark transition-all rounded-full disabled:opacity-50"
        title="Edit Project Details"
      >
        <Edit2 className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md border border-slate-200 bg-white p-8 relative shadow-2xl rounded-2xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-black italic tracking-tighter mb-6 text-slate-900">
              Edit <span className="text-poly-teal-dark">Project Meta</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black tracking-[0.2em] text-slate-500 mb-2 italic">
                  Project Name
                </label>
                <input
                  name="name"
                  required
                  defaultValue={project.name}
                  placeholder="e.g. Exhaust Manifold v1"
                  className="w-full bg-slate-50 border border-slate-200 p-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-poly-teal-light outline-none rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black tracking-[0.2em] text-slate-500 mb-2 italic">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={project.description || ""}
                  placeholder="Design specifications and requirements..."
                  className="w-full bg-slate-50 border border-slate-200 p-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-poly-teal-light outline-none h-24 resize-none rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black tracking-[0.2em] text-slate-500 mb-2 italic">
                  Notification Email (Optional)
                </label>
                <input
                  type="email"
                  name="notificationEmail"
                  defaultValue={project.notificationEmail || ""}
                  placeholder="staff@polyunity.com"
                  className="w-full bg-slate-50 border border-slate-200 p-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-poly-teal-light outline-none rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-4 bg-poly-teal-light hover:bg-poly-teal-dark disabled:opacity-50 text-white font-black italic tracking-widest text-xs transition-all flex items-center justify-center gap-2 rounded-xl shadow-sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Update Details"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
