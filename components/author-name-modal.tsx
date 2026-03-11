"use client";

import React, { useState } from "react";
import { User, ArrowRight } from "lucide-react";

interface AuthorNameModalProps {
    onConfirm: (name: string) => void;
}

export default function AuthorNameModal({ onConfirm }: AuthorNameModalProps) {
    const [name, setName] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim());
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
                    <div className="relative group">
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Full Name"
                            className="w-full bg-slate-50 border border-slate-200 p-5 pr-14 text-sm font-black italic tracking-widest text-slate-800 focus:ring-2 focus:ring-poly-teal-light outline-none transition-all placeholder:opacity-40 group-hover:bg-slate-100 rounded-xl"
                            required
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-2 bottom-2 aspect-square bg-poly-teal-light flex items-center justify-center hover:bg-poly-teal-dark transition-all group-hover:scale-105 rounded-lg"
                        >
                            <ArrowRight className="h-4 w-4 text-white" />
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
