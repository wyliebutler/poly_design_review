"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import Link from "next/link";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorStr: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorStr: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, errorStr: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught rendering error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-50 relative z-50">
           <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border-2 border-red-100 flex flex-col items-center text-center space-y-6">
               <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-2">
                   <AlertTriangle className="w-8 h-8" />
               </div>
               
               <div>
                   <h2 className="text-xl font-black italic tracking-tighter text-slate-900 mb-2">
                     Failed to Parse 3D Geometry
                   </h2>
                   <p className="text-xs text-slate-500 font-medium leading-relaxed tracking-wide">
                     The engine encountered a fatal error while trying to read this STL file. The file may be corrupted, empty, or formatted incorrectly.
                   </p>
               </div>

               <div className="w-full bg-slate-100 rounded-lg p-3 text-[10px] font-mono text-slate-600 truncate text-left border border-slate-200">
                    <span className="font-bold text-slate-400 mr-2">LOG:</span>
                    {this.state.errorStr || "Unknown Parse Exception"}
               </div>

               <div className="flex w-full gap-3 pt-4">
                   <button 
                      onClick={() => window.location.reload()}
                      className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                   >
                     <RefreshCcw className="w-4 h-4" /> Reload
                   </button>
                   <Link 
                      href="/dashboard"
                      className="flex-1 py-3 px-4 bg-poly-teal-dark hover:opacity-90 text-white font-black text-[10px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                   >
                     <Home className="w-4 h-4" /> Dashboard
                   </Link>
               </div>
           </div>
        </div>
      );
    }

    return this.props.children;
  }
}
