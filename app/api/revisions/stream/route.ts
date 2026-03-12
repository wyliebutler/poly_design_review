import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return new Response("Missing projectId", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;

      const sendEvent = (data: any) => {
        if (!isActive) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          isActive = false;
        }
      };

      try {
        const initialRevisions = await prisma.revision.findMany({
            where: { projectId },
            orderBy: { versionNumber: 'desc' }
        });
        sendEvent(initialRevisions);
      } catch (err) {
        console.error("Failed to stream initial state:", err);
      }

      const interval = setInterval(async () => {
        if (!isActive) {
           clearInterval(interval);
           return;
        }
        try {
          const revisions = await prisma.revision.findMany({
            where: { projectId },
            orderBy: { versionNumber: 'desc' }
          });
          sendEvent(revisions);
        } catch (error) {
           console.error("SSE Database Sync Phase Error (Revisions):", error);
        }
      }, 3000);

      request.signal.addEventListener("abort", () => {
        isActive = false;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
