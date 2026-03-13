"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, LayoutDashboard, Home, User } from "lucide-react";

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link
                            href="/"
                            className="text-lg font-black uppercase italic tracking-tighter text-poly-teal-dark hover:text-poly-teal-light transition-colors"
                        >
                            Design Review<span className="text-poly-teal-light">_</span>Portal
                        </Link>

                        {session && (
                            <div className="hidden md:flex items-center gap-6">
                                <Link
                                    href="/"
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-poly-teal-dark transition-colors flex items-center gap-2"
                                >
                                    <Home className="h-3 w-3" /> Home
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-poly-teal-dark transition-colors flex items-center gap-2"
                                >
                                    <LayoutDashboard className="h-3 w-3" /> Dashboard
                                </Link>
                            </div>
                        )}
                    </div>

                    {session && (
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full">
                                <User className="h-3 w-3 text-poly-teal-dark" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                                    {session.user?.name || "Admin"}
                                </span>
                            </div>

                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors flex items-center gap-2 group"
                            >
                                <LogOut className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
