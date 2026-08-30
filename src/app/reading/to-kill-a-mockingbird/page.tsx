"use client";

import { useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Loader2, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const ranges = [
  { label: "Chapter 1 • Origins and Maycomb", start: 3, end: 6 },
  { label: "Chapter 1 • Dill Arrives", start: 7, end: 8 },
  { label: "Chapter 1 • The Radley Place", start: 8, end: 15 },
];

export default function MockingbirdReader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(3);
  const [pageInput, setPageInput] = useState("3");
  const [total, setTotal] = useState(285);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    getDocument({ url: "/api/reading/to-kill-a-mockingbird" }).promise.then((pdf) => {
      if (cancelled) return;
      pdfRef.current = pdf;
      setTotal(pdf.numPages);
      setLoading(false);
    }).catch(() => { if (!cancelled) { setError("The novel could not be loaded."); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const saved = Number(localStorage.getItem("tkm-reader-page"));
    if (saved >= 1) { setPage(saved); setPageInput(String(saved)); }
  }, []);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || loading) return;
    let cancelled = false;
    setRendering(true);
    pdf.getPage(page).then(async (pdfPage) => {
      if (cancelled) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const fitScale = Math.max(1, (window.innerWidth - 32) / base.width);
      const scale = Math.min(2.4, fitScale * zoom);
      const viewport = pdfPage.getViewport({ scale });
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
      if (!cancelled) { setRendering(false); localStorage.setItem("tkm-reader-page", String(page)); }
    }).catch(() => { if (!cancelled) { setError("This page could not be rendered."); setRendering(false); } });
    return () => { cancelled = true; };
  }, [page, loading, zoom]);

  const goTo = (next: number) => { const safe = Math.max(1, Math.min(total, next)); setPage(safe); setPageInput(String(safe)); };
  const submitPage = () => { const requested = Number(pageInput); if (Number.isFinite(requested)) goTo(requested); else setPageInput(String(page)); };

  return <main className="min-h-screen bg-[#030712] text-white px-3 py-5 sm:px-6 sm:py-8">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3"><div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-300"><BookOpen size={24} /></div><div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.25em] text-amber-300/70">Guided Reader</p><h1 className="truncate text-2xl font-bold sm:text-4xl">To Kill a Mockingbird</h1><p className="text-sm text-white/50">Harper Lee • page-by-page reading</p></div></div>
        <a href="/drill" className="flex shrink-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/15"><ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span></a>
      </header>
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="card h-fit space-y-3 border-white/10 p-3 lg:sticky lg:top-5"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">Reading plan</h2><RotateCcw size={14} className="text-white/35" /></div><p className="text-xs leading-relaxed text-white/45">Start with Chapter 1. Read a short range, pause to reflect, then continue.</p>{ranges.map((range) => <button key={range.label} onClick={() => goTo(range.start)} className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${page >= range.start && page <= range.end ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.07]"}`}><span className="block font-semibold">{range.label}</span><span className="mt-1 block text-[10px] text-white/40">PDF pages {range.start}–{range.end}</span></button>)}</aside>
        <section className="space-y-4"><div className="card border-amber-400/20 bg-amber-400/[0.04] p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><button onClick={() => goTo(page - 1)} disabled={page <= 1} className="rounded-lg bg-white/10 p-2 disabled:opacity-30"><ChevronLeft size={18} /></button><button onClick={() => goTo(page + 1)} disabled={page >= total} className="rounded-lg bg-white/10 p-2 disabled:opacity-30"><ChevronRight size={18} /></button><span className="text-sm font-semibold">Page</span><input value={pageInput} onChange={(e) => setPageInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPage()} onBlur={submitPage} className="w-16 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center text-sm outline-none focus:border-amber-400/60" /><span className="text-sm text-white/50">of {total}</span></div><div className="flex items-center gap-1"><button onClick={() => setZoom((value) => Math.max(0.8, Number((value - 0.2).toFixed(1))))} className="rounded-lg bg-white/10 p-2 text-white/60 hover:text-white" title="Zoom out"><ZoomOut size={16} /></button><span className="min-w-12 text-center text-xs text-white/50">{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(2, Number((value + 0.2).toFixed(1))))} className="rounded-lg bg-white/10 p-2 text-white/60 hover:text-white" title="Zoom in"><ZoomIn size={16} /></button><button onClick={() => canvasRef.current?.requestFullscreen?.()} className="ml-1 rounded-lg bg-white/10 p-2 text-white/60 hover:text-white" title="Fullscreen"><Maximize2 size={16} /></button></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${(page / total) * 100}%` }} /></div></div>
          <div className="relative overflow-auto rounded-2xl border border-white/10 bg-[#111827] p-2 shadow-2xl sm:p-5">{loading ? <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-white/50"><Loader2 className="animate-spin" /> Loading reader...</div> : error ? <div className="flex min-h-[60vh] items-center justify-center text-sm text-red-300">{error}</div> : <><canvas ref={canvasRef} className="mx-auto block max-w-full bg-white" />{rendering && <div className="absolute right-5 top-5 rounded-full bg-black/70 px-3 py-1 text-xs text-white/70">Rendering...</div>}</>}</div>
          <div className="flex items-center justify-between"><button onClick={() => goTo(page - 1)} disabled={page <= 1} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm disabled:opacity-30"><ChevronLeft size={16} /> Previous</button><span className="text-xs text-white/35">Your page is saved on this device</span><button onClick={() => goTo(page + 1)} disabled={page >= total} className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-30">Next <ChevronRight size={16} /></button></div>
        </section>
      </div>
    </div>
  </main>;
}
