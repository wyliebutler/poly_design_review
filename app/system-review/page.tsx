import { Hammer, ArrowLeft, Lightbulb, TrendingUp, ShieldCheck, Cog } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";

export default async function SystemReview() {
  const session = await auth();
  const isAdminUser = !!session;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex justify-between items-start">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-poly-teal-dark hover:text-poly-indigo transition-colors mb-6 pb-2 border-b-2 border-transparent hover:border-poly-indigo">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <h1 className="text-4xl sm:text-5xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-4">
              <div className="bg-poly-teal-light/20 p-3 rounded-xl border-2 border-poly-teal-light/30">
                <ShieldCheck className="w-8 h-8 text-poly-teal-dark" />
              </div>
              Platform Review
            </h1>
            <p className="mt-4 text-lg text-slate-600 font-medium">
              A comprehensive overview of the rationale, customer impact, core features, and future roadmap of the Design Review Portal.
            </p>
          </div>
          
          {isAdminUser && (
              <div className="bg-poly-indigo/10 text-poly-indigo px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest border border-poly-indigo/20 flex items-center gap-2">
                  <Cog className="w-4 h-4" /> Admin Access
              </div>
          )}
        </div>

        <div className="space-y-12">
          
          {/* Section 1 */}
          <section className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200/60 relative overflow-hidden group hover:border-poly-teal-light/30 transition-colors">
             <div className="absolute top-0 right-0 w-32 h-32 bg-poly-teal-light/5 rounded-bl-full -z-10 group-hover:bg-poly-teal-light/10 transition-colors" />
             <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800 mb-6 flex items-center gap-3">
                 <span className="text-poly-teal-dark">01.</span> Product Rationale
             </h2>
             <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-relaxed space-y-4">
                 <p>
                    The Design Review Portal is a secure, admin-led gateway designed specifically for engineering, product development, and manufacturing teams to collaborate on 3D designs.
                 </p>
                 <p>
                    Traditional design reviews often suffer from disjointed communication—engineers send STL files via email, and clients respond with vague text feedback or marked-up 2D screenshots that are hard to interpret in a 3D context. This portal solves that by unifying the <strong>3D visualization</strong>, <strong>version control</strong>, and <strong>contextual discussion</strong> into a single, seamless web interface.
                 </p>
                 <p>
                    It allows admins to share designs securely via private, obfuscated links, enabling clients to interact with the 3D model directly in their browser without needing specialized software or accounts.
                 </p>
             </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200/60 relative overflow-hidden group hover:border-poly-indigo/30 transition-colors">
             <div className="absolute top-0 right-0 w-32 h-32 bg-poly-indigo/5 rounded-bl-full -z-10 group-hover:bg-poly-indigo/10 transition-colors" />
             <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800 mb-8 flex items-center gap-3">
                 <span className="text-poly-indigo">02.</span> Transforming the Customer Process
             </h2>
             <div className="grid gap-6 sm:grid-cols-2">
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                     <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-3">Eliminating Friction</h3>
                     <p className="text-sm text-slate-600 font-medium leading-relaxed">Customers lack CAD software. Delivering a zero-install, browser-based 3D experience completely removes the friction of sharing designs.</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                     <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-3">Contextual Precision</h3>
                     <p className="text-sm text-slate-600 font-medium leading-relaxed">Pin-Drop and Measurement tools allow customers to point to exact 3D coordinates, drastically reducing manufacturing errors caused by vague feedback.</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                     <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-3">Accelerating Timelines</h3>
                     <p className="text-sm text-slate-600 font-medium leading-relaxed">Real-time, synchronous chat attached directly to geometry means decisions are made faster. Clients can slice, verify, and approve in minutes.</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                     <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-3">Single Source of Truth</h3>
                     <p className="text-sm text-slate-600 font-medium leading-relaxed">Housing the model and discussion together under a strict Revision tree guarantees a client never approves the wrong revision.</p>
                 </div>
             </div>
          </section>

          {/* Section 3 */}
          <section className="bg-slate-900 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-poly-teal-light/10 rounded-bl-full -z-10 blur-3xl group-hover:bg-poly-teal-light/20 transition-colors" />
             <h2 className="text-2xl font-black uppercase italic tracking-tight text-white mb-8 flex items-center gap-3">
                 <span className="text-poly-teal-light text-opacity-80">03.</span> Core Features
             </h2>
             <div className="space-y-6">
                {[
                    { title: "Interactive 3D STL Viewer", desc: "Auto-fitting camera and automatic geometry stats (Volume, Surface Area, Dimensions) powered by React Three Fiber." },
                    { title: "Advanced Inspection", desc: "Dynamic cross-section slicing (X/Y/Z axis) and precision point-to-point measurements snapped to geometry vertices." },
                    { title: "Contextual Collaboration", desc: "Live drop-pin feedback, Server-Sent Events (SSE) chat, snapshot captures, and media attachments (PDF/Images)." },
                    { title: "Revision Management", desc: "Full history timeline control and obfuscated secure links (UUIDs) to protect IP while allowing zero-login client access." },
                    { title: "Full Project Archiving", desc: "Generate a complete .ZIP of all STL revisions, snapshots, and a unified Markdown discussion log for company records." }
                ].map((feature, idx) => (
                    <div key={idx} className="flex gap-4 items-start border-b border-white/10 pb-6 last:border-0 last:pb-0">
                        <div className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center text-poly-teal-light font-black text-xs shrink-0 mt-0.5">
                            {idx + 1}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">{feature.title}</h3>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed">{feature.desc}</p>
                        </div>
                    </div>
                ))}
             </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border-2 border-poly-indigo/20 relative overflow-hidden">
             <div className="absolute top-4 right-8 opacity-10">
                 <TrendingUp className="w-48 h-48 text-poly-indigo" />
             </div>
             <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800 mb-8 flex items-center gap-3 relative z-10">
                 <span className="text-poly-indigo">04.</span> Future AI Integration
             </h2>
             <p className="text-slate-600 font-medium mb-8 relative z-10">
                Given the structured nature of 3D data and rich text discussions, the platform is perfectly positioned for intelligent automation.
             </p>
             <div className="grid gap-4 sm:grid-cols-2 relative z-10">
                 {[
                     { title: "Manufacturability Co-Pilot", desc: "AI ingests STLs and automatically drops pins flagging thin walls, overhangs, or tight tolerances before client review." },
                     { title: "Feedback Summarization", desc: "LLMs read long discussion histories across multiple revisions and generate 'Executive Summaries' for new engineers." },
                     { title: "Semantic Search", desc: "Vector embeddings across projects allow engineers to search conceptually (e.g., 'past threading tolerance issues')." },
                     { title: "Auto-Orient Preparation", desc: "Spatial AI calculates the optimal orientation to minimize 3D print support material or maximize part strength." },
                     { title: "Client Sentiment Analysis", desc: "Lightweight sentiment analysis triggers admin alerts if a client's tone becomes frustrated across excessive revisions." }
                 ].map((ai, idx) => (
                     <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                         <h3 className="text-sm font-black text-poly-indigo mb-2 flex items-center gap-2">
                             <Lightbulb className="w-4 h-4" /> {ai.title}
                         </h3>
                         <p className="text-xs text-slate-500 font-medium leading-relaxed">{ai.desc}</p>
                     </div>
                 ))}
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}
