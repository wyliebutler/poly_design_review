import { Hammer, ArrowRight, Shield, MessageSquare, Box } from "lucide-react";
import Link from "next/link";
import { getSettings } from "@/lib/settings-actions";

export default async function Home() {
  const settings = await getSettings();
  
  // Try to split the appName into two lines nicely like it was originally (Design / Review Portal)
  // Or just display it nicely. If it's a long string, maybe split on the first space.
  const nameParts = settings.appName.split(" ");
  const firstWord = nameParts.length > 1 ? nameParts[0] : settings.appName;
  const restOfName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  return (
    <div className="relative isolate pt-14">
      {/* Background Grid */}
      <div className="absolute inset-x-0 top-0 -z-10 h-full w-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center mb-8">
            <div className="bg-poly-teal-light/10 p-3 rounded-full border border-poly-teal-light/20">
              <Hammer className="h-8 w-8 text-poly-teal-dark" />
            </div>
          </div>

          <h1 className="text-4xl font-black tracking-tighter sm:text-7xl uppercase italic leading-none text-slate-900">
            {firstWord} <br />
            {restOfName && <span className="text-poly-teal-dark">{restOfName}</span>}
          </h1>

          <p className="mt-8 text-lg leading-8 text-slate-500 font-medium max-w-lg mx-auto">
            A secure, admin-led gateway for design reviews.
            Share 3D models via private links and collaborate with precision.
          </p>

          <div className="mt-12 flex items-center justify-center gap-6">
            <Link href="/dashboard" className="px-10 py-5 bg-poly-teal-light hover:bg-poly-teal-dark text-white rounded-xl font-black italic uppercase tracking-widest text-sm transition-all shadow-xl shadow-poly-teal-light/20 active:scale-95 inline-block">
              Admin Dashboard
            </Link>
            <Link href="/system-review" className="px-10 py-5 bg-white border-2 border-slate-200 hover:border-poly-indigo hover:text-poly-indigo text-slate-700 rounded-xl font-black italic uppercase tracking-widest text-sm transition-all shadow-sm active:scale-95 inline-block flex items-center gap-2">
              <Shield className="w-4 h-4" /> System Review
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            { icon: Box, title: "3D STL Viewer", desc: "Interactive 3D visualization for engineered parts." },
            { icon: MessageSquare, title: "Live Discussions", desc: "Private back-and-forth review sessions." },
            { icon: Shield, title: "Secure Links", desc: "Obfuscated IDs for private project access." }
          ].map((feature, i) => (
            <div key={i} className="p-8 border border-slate-200 bg-white backdrop-blur-sm group hover:border-poly-teal-light/50 transition-all rounded-2xl shadow-sm">
              <feature.icon className="h-6 w-6 text-poly-teal-dark mb-4" />
              <h3 className="text-xl font-bold uppercase tracking-tight mb-2 italic text-slate-800">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
