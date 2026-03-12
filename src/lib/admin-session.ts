import "server-only";
import crypto from "node:crypto";

const COOKIE_NAME = "owner_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) throw new Error("Missing ADMIN_SECRET_KEY");
  return secret;
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function createAdminSessionToken() {
  const payload = { role: "owner", exp: Date.now() + SESSION_MAX_AGE * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyAdminSessionToken(token?: string) {
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    );
    return payload.role === "owner" && payload.exp > Date.now();
  } catch {
    return false;
  }
}