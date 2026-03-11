import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const filePath = join(process.cwd(), "public", "uploads", filename);

  try {
    const fileBuffer = await readFile(filePath);
    
    // Determine content type
    let contentType = "application/octet-stream";
    if (filename.endsWith(".stl")) {
      contentType = "model/stl";
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(`Failed to serve upload: ${filename}`, error);
    return new NextResponse("File not found", { status: 404 });
  }
}
