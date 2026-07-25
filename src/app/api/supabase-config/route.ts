import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  });
}
