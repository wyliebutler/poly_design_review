import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewDesignModal from "@/components/new-design-modal";
import ProjectList from "@/components/project-list";

export default async function Dashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { revisions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  const serializedProjects = JSON.parse(JSON.stringify(projects));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Project Dashboard</h1>
          <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest">Manage designs & reviews</p>
        </div>
        <NewDesignModal />
      </div>

      <ProjectList projects={serializedProjects} />
    </div>
  );
}
