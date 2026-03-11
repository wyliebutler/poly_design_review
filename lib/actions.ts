"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";

export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const file = formData.get("stlFile") as File;

  if (!file || file.size === 0) {
    throw new Error("No STL file uploaded");
  }

  if (!file.name.toLowerCase().endsWith(".stl")) {
    throw new Error("Only .STL files are accepted");
  }

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 50MB limit");
  }

  // Ensure upload directory exists
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  // Create unique filename
  const fileExtension = file.name.split(".").pop();
  const rawName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const uniqueFilename = `${Date.now()}-${rawName}.${fileExtension}`;
  const filePath = join(uploadDir, uniqueFilename);

  // Save file
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

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
  });

  revalidatePath("/dashboard");
  return project;
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

export async function uploadRevision(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const file = formData.get("stlFile") as File;
  if (!file || file.size === 0) throw new Error("No STL file uploaded");
  if (!file.name.toLowerCase().endsWith(".stl")) throw new Error("Only .STL files are accepted");

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 50MB limit");
  }

  // Get project to determine next version number
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { revisions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  if (!project) throw new Error("Project not found");

  const nextVersion = (project.revisions[0]?.versionNumber || 0) + 1;

  // Save file
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const fileExtension = file.name.split(".").pop();
  const rawProjectName = project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const uniqueFilename = `${Date.now()}-${rawProjectName}-v${nextVersion}.${fileExtension}`;
  const filePath = join(uploadDir, uniqueFilename);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

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

  // Create new revision
  const revision = await prisma.revision.create({
    data: {
      projectId,
      versionNumber: nextVersion,
      fileName: file.name,
      fileUrl: fileUrl,
      thumbnailUrl: thumbnailUrl,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/review/${project.obfuscatedId}`);
  return revision;
}

export async function postComment(formData: FormData) {
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
    throw new Error("Unauthorized");
  }

  // Determine the final author name to store
  let finalAuthorName = authorName || (isAuthorAdmin ? "Admin" : "Client");
  console.log("[SERVER DEBUG] Initial finalAuthorName:", finalAuthorName);

  // If logged in, use their actual name if available
  if (session?.user?.name && isAuthorAdmin) {
    finalAuthorName = session.user.name;
  }

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

  if (attachmentFile && attachmentFile.size > 0) {
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    
    // Create unique filename but preserve extension
    const extension = attachmentFile.name.split('.').pop();
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

  // Revalidate both the dynamic route and the specific ID if possible
  revalidatePath("/review/[id]", "page");
  return comment;
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

export async function getFullProjectHistory(projectId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

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
    return project;
  } catch (error) {
    console.error("[SERVER ERROR] Failed to fetch full project history: ", error);
    return null;
  }
}
