import { NextResponse } from "next/server";
import { isRecallAdmin, recallClient, recallError } from "@/lib/server/subject-recall";

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  try {
    if (!(await isRecallAdmin())) return json({ error: "Sign in to the admin portal." }, 401);
    const raw = await request.text();
    if (raw.length > 2000) return json({ error: "Use a subject name of up to 120 characters." }, 400);
    const body = JSON.parse(raw);
    if (!body || typeof body.name !== "string" || (body.level !== "jss3" && body.level !== "ss3")) {
      return json({ error: "Provide a subject name and choose JSS3 or SS3." }, 400);
    }
    const name = body.name.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 120) return json({ error: "Use a subject name between 2 and 120 characters." }, 400);
    const db = recallClient(true);
    async function findSubject() {
      const { data, error } = await db.from("subjects").select("id, name, level")
        .eq("level", body.level).ilike("name", name.replace(/[\\%_]/g, "\\$&")).order("id");
      if (error) throw error;
      return data?.find((subject) => subject.name.toLowerCase() === name.toLowerCase());
    }
    const existing = await findSubject();
    if (existing) return json({ subject: existing });
    const { data, error } = await db.from("subjects").insert({ name, level: body.level })
      .select("id, name, level").single();
    if (error?.code === "23505") {
      const subject = await findSubject();
      if (subject) return json({ subject });
    }
    if (error) return json({ error: "Could not add the subject. Please try again." }, 500);
    return json({ subject: data }, 201);
  } catch (error) {
    return json({ error: error instanceof SyntaxError ? "Invalid subject details." : recallError(error) }, error instanceof SyntaxError ? 400 : 500);
  }
}
