import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// To maintain persistent connections, force dynamic routing.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const revisionId = searchParams.get("revisionId");

  if (!revisionId) {
    return new Response("Missing revisionId", { status: 400 });
  }

  const encoder = new TextEncoder();

  // Create a persistent ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true;

      // Helper to serialize and dispatch the event chunk
      const sendEvent = (data: any) => {
        if (!isActive) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          isActive = false;
        }
      };

      // 1. Immediately dump the initial state to the client upon connection
      try {
        const initialComments = await prisma.comment.findMany({
            where: { revisionId },
            orderBy: { createdAt: 'asc' }
        });
        sendEvent(initialComments);
      } catch (err) {
        console.error("Failed to stream initial state:", err);
      }

      // 2. Begin internal database synchronization
      // This eliminates client HTTP negotiation overhead and browser connection limitations.
      const interval = setInterval(async () => {
        if (!isActive) {
           clearInterval(interval);
           return;
        }
        try {
          const comments = await prisma.comment.findMany({
            where: { revisionId },
            orderBy: { createdAt: 'asc' }
          });
          sendEvent(comments);
        } catch (error) {
          console.error("SSE Database Sync Phase Error:", error);
        }
      }, 3000);

      // 3. Gracefully teardown the connection pool interval if the client disconnects
      request.signal.addEventListener("abort", () => {
        isActive = false;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    }
  });

  // Return the standard SSE HTTP headers natively
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
