import type { Metadata } from "next";
import SubjectRecall from "@/components/SubjectRecall";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Subject Notes & Recall — Scholars Arena" };

export default async function RecallPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  return <SubjectRecall startWithReview={(await searchParams).review === "1"} />;
}
