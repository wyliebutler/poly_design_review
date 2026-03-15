"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, LayoutDashboard, Home, User, Settings } from "lucide-react";
import { useState, useEffect } from "react";

import { getSettings } from "@/lib/settings-actions";

export default function Navbar() {
    const { data: session } = useSession();
    
    // We fetch settings client-side or use a simple hook, but since Navbar is a client component,
    // let's create a state for it or pass it as props. Wait, Navbar is a client component: "use client"
    // Fetching in a client component on mount is fine, but can cause flicker.
    // Let's just fetch it in useEffect or keep it simple.
    const [settings, setSettings] = useState<any>({
        appName: "Design Review_Portal",
        logoUrl: ""
    });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        getSettings().then(setSettings);
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link
                            href="/"
                            className="text-lg font-black uppercase italic tracking-tighter text-poly-teal-dark hover:text-poly-teal-light transition-colors flex items-center gap-2"
                        >
                            {mounted && settings?.logoUrl ? (
                                <img src={settings.logoUrl} alt="Logo" className="h-8 object-contain" />
                            ) : (
                                mounted && settings?.appName ? settings.appName : "Design Review_Portal"
                            )}
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
                                {session.user && (session.user as any).role === "ADMIN" && (
                                    <Link
                                        href="/dashboard/settings"
                                        className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-poly-teal-dark transition-colors flex items-center gap-2"
                                    >
                                        <Settings className="h-3 w-3" /> Settings
                                    </Link>
                                )}
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
