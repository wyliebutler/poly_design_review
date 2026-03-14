"use client";

import { useState } from "react";
import { Plus, X, Upload, Loader2 } from "lucide-react";
import { createProject } from "@/lib/actions";
import { extractStlThumbnail } from "./thumbnail-extractor";

export default function NewDesignModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [pendingText, setPendingText] = useState("Processing...");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    
    // Extract thumbnail before sending
    const stlFile = formData.get("stlFile") as File | null;
    if (stlFile && stlFile.size > 0 && stlFile.name.toLowerCase().endsWith(".stl")) {
       // Protective File-Size Constraint: 50MB
       if (stlFile.size > 50 * 1024 * 1024) {
           alert("Upload Rejected: STL file size exceeds the 50MB threshold. Please decimate the mesh and try again.");
           setIsPending(false);
           return;
       }

       setPendingText("Generating Thumbnail...");
       try {
           const thumbnailFile = await extractStlThumbnail(stlFile);
           if (thumbnailFile) {
               formData.append("thumbnail", thumbnailFile);
           }
       } catch (err) {
           console.error("Non-fatal error generating thumbnail:", err);
       }
    }

    setPendingText("Uploading Model...");
    try {
      await createProject(formData);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Check console for details.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-3 bg-poly-teal-light hover:bg-poly-teal-dark text-white font-black italic tracking-widest text-xs transition-all active:scale-95 rounded-xl shadow-sm"
      >
        <Plus className="h-4 w-4" /> New Design
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
              Initiate <span className="text-poly-teal-dark">New Design</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black tracking-[0.2em] text-slate-500 mb-2 italic">
                  Project Name
                </label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Exhaust Manifold v1"
                  className="w-full bg-slate-50 border border-slate-200 p-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-poly-teal-light outline-none placeholder:opacity-40 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black tracking-[0.2em] text-slate-500 mb-2 italic">
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Design specifications and requirements..."
                  className="w-full bg-slate-50 border border-slate-200 p-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-poly-teal-light outline-none h-24 resize-none placeholder:opacity-40 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black tracking-[0.2em] text-slate-500 mb-2 italic">
                  Notification Email (Optional)
                </label>
                <input
                  type="email"
                  name="notificationEmail"
                  placeholder="team@polyunity.com"
                  className="w-full bg-slate-50 border border-slate-200 p-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-poly-teal-light outline-none placeholder:opacity-40 rounded-xl"
                />
                <p className="text-[10px] text-slate-500 mt-2 italic">Where should client comments and revision notices be sent?</p>
              </div>

              <div>
                <label className="block text-[10px] font-black tracking-[0.2em] text-slate-500 mb-2 italic">
                  Direct STL Upload
                </label>
                <div className="relative">
                  <input
                    type="file"
                    name="stlFile"
                    required
                    accept=".stl"
                    className="w-full bg-slate-50 border border-slate-200 p-4 pl-12 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-poly-teal-light outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-poly-teal-light file:text-white hover:file:bg-poly-teal-dark transition-all cursor-pointer rounded-xl"
                  />
                  <Upload className="absolute left-4 top-4 h-4 w-4 text-poly-teal-dark" />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 italic">Select the engineered .STL model from your local storage.</p>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-4 bg-poly-teal-light hover:bg-poly-teal-dark disabled:opacity-50 text-white font-black italic tracking-widest text-xs transition-all flex items-center justify-center gap-2 rounded-xl"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {pendingText}
                  </>
                ) : (
                  "Create Project"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
