import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const filePath = path.join(process.cwd(), "New sets of materials", "TKMFullText.pdf");
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Reading source unavailable" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const range = request.headers.get("range");
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  });

  if (!range) {
    headers.set("Content-Length", String(stat.size));
    return new NextResponse(fs.createReadStream(filePath) as unknown as BodyInit, { headers });
  }

  const match = range.match(/bytes=(\d+)-(\d*)/);
  if (!match) return new NextResponse("Invalid range", { status: 416 });
  const start = Number(match[1]);
  const end = Math.min(match[2] ? Number(match[2]) : stat.size - 1, stat.size - 1);
  if (start > end || start >= stat.size) return new NextResponse("Range not satisfiable", { status: 416 });

  headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);
  headers.set("Content-Length", String(end - start + 1));
  return new NextResponse(fs.createReadStream(filePath, { start, end }) as unknown as BodyInit, { status: 206, headers });
}
