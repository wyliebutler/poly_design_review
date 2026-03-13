"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

import { Prisma } from "@prisma/client";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";

export type ProjectWithRevisions = Prisma.ProjectGetPayload<{
  include: {
    revisions: {
      include: {
        comments: true;
      };
    };
  };
}>;

export type RevisionWithComments = Prisma.RevisionGetPayload<{
  include: {
    comments: true;
  };
}>;

export async function createProject(formData: FormData): Promise<{ error?: string } | ProjectWithRevisions> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const file = formData.get("stlFile") as File;

  console.log("[createProject] Starting for file:", file.name, "size:", file.size);
  if (!file || file.size === 0) {
    console.error("[createProject] Failed: No STL file uploaded");
    return { error: "No STL file uploaded" };
  }

  if (!file.name.toLowerCase().endsWith(".stl")) {
    console.error("[createProject] Failed: Not an STL file");
    return { error: "Only .STL files are accepted" };
  }

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_FILE_SIZE) {
    console.error("[createProject] Failed: File size exceeds 50MB");
    return { error: "File size exceeds 50MB limit" };
  }

  // Ensure upload directory exists
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  // Create unique filename
  const fileExtension = file.name.split(".").pop();
  const rawName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "unnamed";
  const uniqueFilename = `${Date.now()}-${rawName}.${fileExtension}`;
  const filePath = join(uploadDir, uniqueFilename);
  console.log("[createProject] Generated paths, writing file to:", filePath);

  // Save file
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    console.log("[createProject] File written successfully.");
  } catch (err) {
    console.error("[createProject] Failed to write file to disk:", err);
    return { error: "Failed to write main file" };
  }

  const fileUrl = `/uploads/${uniqueFilename}`;
  
  // Handle Thumbnail if it exists
  const thumbnailFile = formData.get("thumbnail") as File | null;
  let thumbnailUrl = null;
  
  if (thumbnailFile && thumbnailFile.size > 0) {
    const thumbExtension = thumbnailFile.name.split(".").pop();
    const thumbFilename = `${Date.now()}-${rawName}-thumb.${thumbExtension}`;
    const thumbPath = join(uploadDir, thumbFilename);
    const thumbBytes = await thumbnailFile.arrayBuffer();
    await writeFile(thumbPath, Buffer.from(thumbBytes));
    thumbnailUrl = `/uploads/${thumbFilename}`;
  }

  // For this prototype, ensure the admin user exists in the DB
  const user = await prisma.user.upsert({
    where: { email: session.user.email || "admin@portal.local" },
    update: {},
    create: {
      id: "admin-1",
      name: "Administrator",
      email: "admin@portal.local",
      role: "ADMIN"
    }
  });

  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        creatorId: user.id,
        revisions: {
          create: {
            versionNumber: 1,
            fileName: file.name,
            fileUrl: fileUrl,
            thumbnailUrl: thumbnailUrl,
          },
        },
      },
      include: {
        revisions: {
          include: {
            comments: true
          }
        }
      }
    });

    revalidatePath("/dashboard");
    return project;
  } catch (error) {
    console.error("Database error creating project:", error);
    return { error: "Failed to create project in database" };
  }
}

export async function updateProject(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name) throw new Error("Project name is required");

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { name, description },
  });

  revalidatePath("/dashboard");
  return project;
}

export async function archiveProject(projectId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.project.update({
    where: { id: projectId },
    data: { isArchived: true },
  });

  revalidatePath("/dashboard");
}

export async function unarchiveProject(projectId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.project.update({
    where: { id: projectId },
    data: { isArchived: false },
  });

  revalidatePath("/dashboard");
}

export async function deleteProject(projectId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // Get project, its revisions, and all comments to delete files
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { 
      revisions: {
        include: { comments: true }
      } 
    },
  });

  if (!project) throw new Error("Project not found");

  const uploadDir = join(process.cwd(), "public", "uploads");

  // Helper to safely unlink relative URLs
  const safeUnlink = async (url: string | null) => {
    if (!url) return;
    const filename = url.split("/").pop();
    if (!filename) return;
    const filePath = join(uploadDir, filename);
    try {
      await unlink(filePath);
    } catch (err) {
      console.error(`Failed to delete file: ${filePath}`, err);
    }
  };

  // Delete all associated files from disk
  for (const revision of project.revisions) {
    await safeUnlink(revision.fileUrl);
    await safeUnlink(revision.thumbnailUrl);
    
    for (const comment of revision.comments) {
      await safeUnlink(comment.snapshotUrl);
      await safeUnlink(comment.attachmentUrl);
    }
  }

  // Delete project from DB (cascades to revisions and comments)
  await prisma.project.delete({
    where: { id: projectId },
  });

  revalidatePath("/dashboard");
}

export async function uploadRevision(projectId: string, formData: FormData): Promise<{ error?: string } | RevisionWithComments> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const file = formData.get("stlFile") as File;
  if (!file || file.size === 0) return { error: "No STL file uploaded" };
  if (!file.name.toLowerCase().endsWith(".stl")) return { error: "Only .STL files are accepted" };

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_FILE_SIZE) {
    return { error: "File size exceeds 50MB limit" };
  }

  // Get project to determine next version number
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { revisions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  if (!project) return { error: "Project not found" };

  const nextVersion = (project.revisions[0]?.versionNumber || 0) + 1;

  // Save file
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const fileExtension = file.name.split(".").pop();
  const rawProjectName = project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const uniqueFilename = `${Date.now()}-${rawProjectName}-v${nextVersion}.${fileExtension}`;
  const filePath = join(uploadDir, uniqueFilename);

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
  } catch (e) {
    console.error("Failed to write replacement STL file to disk:", e);
    return { error: "Failed to write STL file to disk" };
  }

  const fileUrl = `/uploads/${uniqueFilename}`;
  
  // Handle Thumbnail if it exists
  const thumbnailFile = formData.get("thumbnail") as File | null;
  let thumbnailUrl = null;
  
  if (thumbnailFile && thumbnailFile.size > 0) {
    const thumbExtension = thumbnailFile.name.split(".").pop();
    const thumbFilename = `${Date.now()}-${rawProjectName}-v${nextVersion}-thumb.${thumbExtension}`;
    const thumbPath = join(uploadDir, thumbFilename);
    const thumbBytes = await thumbnailFile.arrayBuffer();
    await writeFile(thumbPath, Buffer.from(thumbBytes));
    thumbnailUrl = `/uploads/${thumbFilename}`;
  }

  try {
    const revision = await prisma.revision.create({
      data: {
        projectId,
        versionNumber: nextVersion,
        fileName: file.name,
        fileUrl: fileUrl,
        thumbnailUrl: thumbnailUrl,
      },
      include: {
        comments: true
      }
    });

    revalidatePath("/dashboard");
    revalidatePath(`/review/${project.obfuscatedId}`);
    return revision;
  } catch (error) {
    console.error("Database error creating revision:", error);
    return { error: "Failed to save revision to database" };
  }
}

export async function postComment(formData: FormData): Promise<{ error?: string } | import("@prisma/client").Comment> {
  const revisionId = formData.get("revisionId") as string;
  const content = formData.get("content") as string;
  const isAuthorAdmin = formData.get("isAuthorAdmin") === "true";
  const authorName = formData.get("authorName") as string | null;
  const x = formData.get("x") ? parseFloat(formData.get("x") as string) : null;
  const y = formData.get("y") ? parseFloat(formData.get("y") as string) : null;
  const z = formData.get("z") ? parseFloat(formData.get("z") as string) : null;
  const snapshotFile = formData.get("snapshot") as File | null;
  const attachmentFile = formData.get("attachment") as File | null;

  console.log("[SERVER DEBUG] postComment called:", { revisionId, isAuthorAdmin, authorName, x, y, z, hasSnapshot: !!snapshotFile });
  const session = await auth();
  console.log("[SERVER DEBUG] Session status:", session ? "Authenticated" : "Unauthenticated");

  // Allow comments without session if it's the client (isAuthorAdmin = false)
  // But strictly require session if admin is posting
  if (isAuthorAdmin && !session?.user) {
    console.warn("[SERVER DEBUG] Unauthorized attempt to post admin comment without session.");
    return { error: "Unauthorized access detected." };
  }

  // Determine the final author name to store:
  // Priority 1: Explicitly provided authorName (e.g., from UI modal)
  // Priority 2: Admin session name
  // Priority 3: Default fallbacks
  let finalAuthorName = authorName;
  
  if (!finalAuthorName) {
    if (session?.user?.name && isAuthorAdmin) {
      finalAuthorName = session.user.name;
    } else {
      finalAuthorName = isAuthorAdmin ? "Admin" : "Client";
    }
  }
  
  console.log("[SERVER DEBUG] Evaluated finalAuthorName:", finalAuthorName);

  // Set userId: null to avoid foreign key errors if the user isn't in the DB
  const userIdToLink = isAuthorAdmin && session?.user?.id ? session.user.id : null;
  
  let snapshotUrl: string | null = null;
  
  if (snapshotFile && snapshotFile.size > 0) {
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    
    const uniqueFilename = `snapshot_${Date.now()}_${Math.round(Math.random() * 1000)}.png`;
    const filePath = join(uploadDir, uniqueFilename);
    
    const bytes = await snapshotFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    
    snapshotUrl = `/uploads/${uniqueFilename}`;
  }

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;

  try {
    if (attachmentFile && attachmentFile.size > 0) {
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      
      const extension = attachmentFile.name.split('.').pop() || "bin";
      const uniqueFilename = `attachment_${Date.now()}_${Math.round(Math.random() * 1000)}.${extension}`;
      const filePath = join(uploadDir, uniqueFilename);
      
      const bytes = await attachmentFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      
      attachmentUrl = `/uploads/${uniqueFilename}`;
      attachmentName = attachmentFile.name;
    }

    const comment = await prisma.comment.create({
      data: {
        revisionId,
        content,
        authorName: finalAuthorName,
        userId: null,
        x,
        y,
        z,
        snapshotUrl,
        attachmentUrl,
        attachmentName
      },
    });

    return comment;
  } catch (err: any) {
    console.error("[SERVER ERROR] postComment failed:", err);
    return { error: "Failed to post comment: " + (err?.message || "Unknown error") };
  }
}

export async function getComments(revisionId: string) {
  try {
    const comments = await prisma.comment.findMany({
      where: { revisionId },
      orderBy: { createdAt: 'asc' }
    });
    return comments;
  } catch (error) {
    console.error("[SERVER ERROR] Failed to fetch comments: ", error);
    return [];
  }
}

export async function getFullProjectHistory(projectId: string): Promise<{ error?: string } | ProjectWithRevisions> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        revisions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            comments: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });
    
    if (!project) return { error: "Project not found" };
    return project;
  } catch (error) {
    console.error("[SERVER ERROR] Failed to fetch full project history: ", error);
    return { error: "Failed to fetch project history from database" };
  }
}
