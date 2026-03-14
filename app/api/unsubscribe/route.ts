import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const subscriber = await prisma.projectSubscriber.update({
      where: { unsubscribeToken: token },
      data: {
        notifyOnRevisions: false,
        notifyOnComments: false,
      },
      include: {
        project: {
          select: { name: true }
        }
      }
    });

    return new NextResponse(`
      <html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; margin: 0; }
            .card { background: white; padding: 2rem 3rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; }
            h1 { color: #0f172a; margin-top: 0; }
            p { color: #64748b; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Successfully Unsubscribed</h1>
            <p>You will no longer receive email notifications for the project: <strong>${subscriber.project.name}</strong>.</p>
            <p>You can close this window at any time.</p>
          </div>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    // If the token doesn't exist, prisma throws a P2025 error.
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }
}
