"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Hammer, Lock } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", {
      password,
      redirect: true,
      callbackUrl: "/dashboard",
    });
    if (res?.error) setError("Invalid Portal Key");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm border border-slate-200 bg-white p-8 backdrop-blur-xl rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-poly-teal-light/10 rounded-full mb-4 border border-poly-teal-light/20">
            <Hammer className="h-6 w-6 text-poly-teal-dark" />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
            Admin <span className="text-poly-teal-dark">Access</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
            Secure Design Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                placeholder="PORTAL_KEY"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 text-xs font-black italic tracking-widest text-slate-800 placeholder:text-slate-400 focus:border-poly-teal-light focus:ring-1 focus:ring-poly-teal-light outline-none transition-all uppercase rounded-xl"
                required
              />
            </div>
            {error && <p className="text-[10px] font-black uppercase text-red-500 text-center tracking-widest">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-poly-teal-light hover:bg-poly-teal-dark text-white font-black italic uppercase tracking-widest text-xs transition-all shadow-lg shadow-poly-teal-light/20 active:scale-95 rounded-xl"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
