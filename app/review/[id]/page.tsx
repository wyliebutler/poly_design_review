import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReviewClient from "@/components/review-client";

export default async function ReviewPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  console.log(`[V3 DEBUG] Accessing ID: ${id}`);

  try {
    const project = await prisma.project.findUnique({
      where: { obfuscatedId: id },
      include: {
        revisions: {
          orderBy: { versionNumber: "desc" },
          include: { comments: { orderBy: { createdAt: "asc" } } },
        },
      },
    });

    if (!project) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-10 text-center">
          <div className="max-w-md border border-slate-200 p-12 bg-white rounded-2xl shadow-sm">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-slate-800">404 _ Project Void</h1>
            <p className="text-xs uppercase tracking-widest text-slate-500">The requested design review does not exist.</p>
          </div>
        </div>
      );
    }

    const currentRevision = project.revisions?.[0] || null;

    const serializedProject = JSON.parse(JSON.stringify(project));
    const serializedRevision = currentRevision ? JSON.parse(JSON.stringify(currentRevision)) : null;

    return <ReviewClient key={project.id} project={serializedProject} currentRevision={serializedRevision} />;
  } catch (error: any) {
    console.error("[V3 FATAL]", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-600 p-10 font-mono text-center">
        <div className="max-w-md border border-red-200 p-12 bg-red-50 rounded-2xl shadow-sm">
          <h1 className="text-2xl font-black mb-4 uppercase">System Exception</h1>
          <p className="border-t border-red-200 pt-4 text-xs">{error.message}</p>
        </div>
      </div>
    );
  }
}
