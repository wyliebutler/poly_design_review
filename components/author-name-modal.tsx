"use client";

import React, { useState } from "react";
import { User, ArrowRight } from "lucide-react";

interface AuthorNameModalProps {
    onConfirm: (data: { name: string; email: string; notifyOnRevisions: boolean; notifyOnComments: boolean }) => void;
}

export default function AuthorNameModal({ onConfirm }: AuthorNameModalProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [notifyOnRevisions, setNotifyOnRevisions] = useState(true);
    const [notifyOnComments, setNotifyOnComments] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm({
                name: name.trim(),
                email: email.trim(),
                notifyOnRevisions,
                notifyOnComments
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
            <div className="w-full max-w-md p-10 bg-white border border-slate-200 shadow-2xl space-y-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 rounded-2xl">
                <div className="space-y-4 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-poly-teal-light/10 border border-poly-teal-light/20 rounded-full mb-2">
                        <User className="h-6 w-6 text-poly-teal-dark" />
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter text-slate-900">Identity Check</h2>
                    <p className="text-[10px] font-black tracking-widest text-slate-500 max-w-xs mx-auto">
                        Please provide your name to participate in this design review session.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <div className="relative group">
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Full Name"
                                className="w-full bg-slate-50 border border-slate-200 p-5 text-sm font-black italic tracking-widest text-slate-800 focus:ring-2 focus:ring-poly-teal-light outline-none transition-all placeholder:opacity-40 rounded-xl"
                                required
                            />
                        </div>

                        <div className="relative group">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Your Email Address (Optional)"
                                className="w-full bg-slate-50 border border-slate-200 p-5 text-sm font-black italic tracking-widest text-slate-800 focus:ring-2 focus:ring-poly-teal-light outline-none transition-all placeholder:opacity-40 rounded-xl"
                            />
                        </div>

                        {email && (
                            <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl text-left">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={notifyOnRevisions}
                                        onChange={(e) => setNotifyOnRevisions(e.target.checked)}
                                        className="w-4 h-4 text-poly-teal-light border-slate-300 rounded focus:ring-poly-teal-light"
                                    />
                                    <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase group-hover:text-slate-900 transition-colors">Notify me of new revisions</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={notifyOnComments}
                                        onChange={(e) => setNotifyOnComments(e.target.checked)}
                                        className="w-4 h-4 text-poly-teal-light border-slate-300 rounded focus:ring-poly-teal-light"
                                    />
                                    <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase group-hover:text-slate-900 transition-colors">Notify me of all comments</span>
                                </label>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-poly-teal-light hover:bg-poly-teal-dark text-white font-black italic tracking-widest p-5 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            Enter Design Review <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-[8px] font-bold tracking-widest text-center text-slate-400 italic">
                        Your name will be persistent for this device.
                    </p>
                </form>
            </div>
        </div>
    );
}
