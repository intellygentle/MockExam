import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  createAdminSessionToken,
  getAdminCookieName,
} from "@/lib/admin-session";

export async function POST(req: Request) {
  const { secretKey } = await req.json();
  const expected = process.env.ADMIN_SECRET_KEY;

  if (
    !secretKey ||
    !expected ||
    !crypto.timingSafeEqual(
      Buffer.from(secretKey),
      Buffer.from(expected)
    )
  ) {
    return NextResponse.json({ message: "Invalid Access" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: getAdminCookieName(),
    value: createAdminSessionToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}