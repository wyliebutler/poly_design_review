import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(request: NextRequest) {
  try {
    const urlParam = request.nextUrl.searchParams.get("url");
    if (!urlParam) {
      return new NextResponse("Missing url parameter", { status: 400 });
    }

    // Ensure it's pointing to our uploads folder to prevent directory traversal
    if (!urlParam.startsWith("/uploads/")) {
      return new NextResponse("Invalid url", { status: 403 });
    }

    const filename = urlParam.replace("/uploads/", "");
    const safeFilename = filename.replace(/\.\./g, ""); // basic sanitization
    const filePath = join(process.cwd(), "public", "uploads", safeFilename);

    let file;
    try {
        file = await readFile(filePath);
    } catch(e) {
        return new NextResponse("File not found", { status: 404 });
    }
    
    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("PDF api error:", error);
    return new NextResponse("Error loading pdf", { status: 500 });
  }
}
