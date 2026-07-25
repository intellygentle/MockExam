"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { 
  PlusCircle, Trash2, Database, Upload, Download,
  FileText, AlertTriangle, CheckCircle2, 
  CalendarDays, Loader2, FileUp, Square, CheckSquare,
  Pencil, Search, ChevronRight, ArrowLeft
} from "lucide-react";

type Subject = { id: number; name: string; department_id: number | null; level: string };
type Question = {
  id?: number; level: string; subject_id: number | null; year: number;
  category: string; question: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  option_e: string;
  passage: string;
  correct_option: "a" | "b" | "c" | "d" | "e"; explanation: string;
};

type UploadResult = {
  inserted: number;
  errors: { row: number; message: string }[];
  totalRows: number;
};

type SubjectInfo = {
  subject: Subject;
  totalQuestions: number;
  years: number[];
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [detailYearFilter, setDetailYearFilter] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState<Question>({
    level: "jss3", subject_id: null, year: currentYear,
    category: "", question: "", option_a: "", option_b: "", option_c: "", option_d: "", option_e: "",
    correct_option: "a", explanation: "", passage: "",
  });

  // ─── COMPUTED ──────────────────────────────────────
  const subjectInfos = useMemo(() => {
    const map = new Map<number, SubjectInfo>();
    for (const q of questions) {
      if (!q.subject_id) continue;
      const existing = map.get(q.subject_id);
      if (existing) {
        existing.totalQuestions++;
        if (!existing.years.includes(q.year)) existing.years.push(q.year);
      } else {
        const subj = subjects.find(s => s.id === q.subject_id);
        if (subj) {
          map.set(q.subject_id, { subject: subj, totalQuestions: 1, years: [q.year] });
        }
      }
    }
    for (const info of map.values()) info.years.sort((a, b) => b - a);
    return Array.from(map.values()).sort((a, b) => a.subject.name.localeCompare(b.subject.name));
  }, [questions, subjects]);

  const detailQuestions = useMemo(() => {
    if (!selectedSubjectId) return [];
    let filtered = questions.filter(q => q.subject_id === selectedSubjectId);
    if (detailYearFilter !== "all") filtered = filtered.filter(q => q.year === detailYearFilter);
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      filtered = filtered.filter(q =>
        q.question.toLowerCase().includes(qLower) ||
        q.explanation.toLowerCase().includes(qLower) ||
        q.option_a.toLowerCase().includes(qLower) ||
        q.option_b.toLowerCase().includes(qLower) ||
        q.option_c.toLowerCase().includes(qLower) ||
        q.option_d.toLowerCase().includes(qLower) ||
        (q.option_e && q.option_e.toLowerCase().includes(qLower)) ||
        String(q.year).includes(qLower)
      );
    }
    return filtered.sort((a, b) => b.year - a.year || (a.id || 0) - (b.id || 0));
  }, [questions, selectedSubjectId, detailYearFilter, searchQuery]);

  const detailYears = useMemo(() => {
    if (!selectedSubjectId) return [];
    const years = new Set<number>();
    for (const q of questions) if (q.subject_id === selectedSubjectId) years.add(q.year);
    return Array.from(years).sort((a, b) => b - a);
  }, [questions, selectedSubjectId]);

  const groupedDetailQuestions = useMemo(() => {
    const grouped = new Map<number, Question[]>();
    for (const q of detailQuestions) {
      const year = q.year;
      if (!grouped.has(year)) grouped.set(year, []);
      grouped.get(year)!.push(q);
    }
    return grouped;
  }, [detailQuestions]);

  // ─── DATA LOADING ──────────────────────────────────
  const loadData = async () => {
    try {
      const supabase = await getSupabase();
      const [subjRes] = await Promise.all([supabase.from("subjects").select("*").order("name")]);
      setSubjects(subjRes.data || []);
    } catch {}
  };

  useEffect(() => { loadQuestions(); loadData(); }, []);

  const loadQuestions = async () => {
    try {
      const supabase = await getSupabase();
      let query = supabase.from("questions").select("*").order("id", { ascending: false });
      if (levelFilter !== "all") query = query.eq("level", levelFilter);
      const { data, error } = await query;
      if (error) throw error;
      setQuestions(data || []);
      setSelectedSubjectId(null);
    } catch { toast.error("Failed to load questions."); }
    finally { setLoading(false); }
  };

  const getSubjectName = (id: number | null) => subjects.find(s => s.id === id)?.name || "";

  // ─── FORM HANDLERS ─────────────────────────────────
  const handleEdit = (q: Question) => {
    setFormData({
      id: q.id, level: q.level, subject_id: q.subject_id, year: q.year,
      category: q.category, question: q.question,
      option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
      option_e: q.option_e || "",
      correct_option: q.correct_option, explanation: q.explanation,
      passage: q.passage || "",
    });
    setEditingId(q.id ?? null);
    setShowUpload(false);
    setShowForm(true);
    setTimeout(() => document.querySelector('.question-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject_id) { toast.error("Please select a subject."); return; }
    const loadingToast = toast.loading(editingId ? "Updating question..." : "Saving question...");
    try {
      const supabase = await getSupabase();
      const subjectName = getSubjectName(formData.subject_id);
      const record: Record<string, any> = {
        level: formData.level, subject_id: formData.subject_id, year: formData.year,
        category: subjectName, question: formData.question,
        option_a: formData.option_a, option_b: formData.option_b,
        option_c: formData.option_c, option_d: formData.option_d,
        option_e: formData.option_e || "",
        correct_option: formData.correct_option, explanation: formData.explanation,
        passage: formData.passage || "",
      };
      if (editingId) {
        const { error } = await supabase.from("questions").update(record).eq("id", editingId);
        if (error) throw error;
        toast.success("Question updated!", { id: loadingToast });
      } else {
        const { error } = await supabase.from("questions").insert([record]);
        if (error) throw error;
        toast.success("Question saved!", { id: loadingToast });
      }
      resetForm();
      loadQuestions();
    } catch { toast.error(editingId ? "Update failed." : "Save failed.", { id: loadingToast }); }
  };

  const resetForm = () => {
    setFormData({ level: "jss3", subject_id: null, year: currentYear, category: "", question: "",
      option_a: "", option_b: "", option_c: "", option_d: "", option_e: "", correct_option: "a", explanation: "", passage: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this question?")) return;
    try {
      const supabase = await getSupabase();
      await supabase.from("questions").delete().eq("id", id);
      toast.success("Question deleted.");
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      loadQuestions();
    } catch { toast.error("Delete failed."); }
  };

  // ─── BATCH DELETE ──────────────────────────────────
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected question${selectedIds.size > 1 ? 's' : ''}?`)) return;
    const toastId = toast.loading(`Deleting ${selectedIds.size} questions...`);
    try {
      const supabase = await getSupabase();
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("questions").delete().in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length} deleted!`, { id: toastId });
      setSelectedIds(new Set());
      setSelectAll(false);
      loadQuestions();
    } catch { toast.error("Batch delete failed.", { id: toastId }); }
  };

  const toggleSelect = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    if (selectAll) { setSelectedIds(new Set()); setSelectAll(false); }
    else { setSelectedIds(new Set(detailQuestions.map(q => q.id!).filter(Boolean))); setSelectAll(true); }
  };

  const handleBackToSubjects = () => {
    setSelectedSubjectId(null);
    setDetailYearFilter("all");
    setSearchQuery("");
    setSelectedIds(new Set());
    setSelectAll(false);
  };

  const handleSelectSubject = (subjectId: number) => {
    setSelectedSubjectId(subjectId);
    setDetailYearFilter("all");
    setSearchQuery("");
    setShowForm(false);
    setShowUpload(false);
    setSelectedIds(new Set());
    setSelectAll(false);
  };

  // ─── BULK UPLOAD ───────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith(".csv")) { toast.error("Please upload a .csv file."); return; }
    setUploading(true);
    setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/questions/upload", { method: "POST", body: fd });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error || "Upload failed."); setUploadResult(null); }
      else {
        setUploadResult(result);
        if (result.inserted > 0) { toast.success(`${result.inserted} questions uploaded!`); loadQuestions(); }
        if (result.errors?.length > 0) { toast.error(`${result.errors.length} row(s) had errors.`); }
      }
    } catch { toast.error("Upload failed."); }
    finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-6 rounded-3xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-policeGold/20 p-3 rounded-full text-policeGold"><Database size={28} /></div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-white">
              {selectedSubjectId ? getSubjectName(selectedSubjectId) : "Questions Database"}
            </h2>
            <p className="text-sm text-white/50">
              {selectedSubjectId
                ? `${detailQuestions.length} question${detailQuestions.length !== 1 ? 's' : ''}`
                : `${questions.length} questions across ${subjectInfos.length} subjects`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!selectedSubjectId && (
            <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setLoading(true); setTimeout(() => loadQuestions(), 0); }}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none cursor-pointer">
              <option value="all">All Levels</option>
              <option value="jss3">JSS3</option>
              <option value="ss3">SS3</option>
            </select>
          )}
          <button onClick={() => { setShowUpload(false); if (showForm) resetForm(); else { setEditingId(null); setShowForm(true); } }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition ${
              showForm ? "bg-white/10 text-white" : "bg-policeGold text-policeBlue hover:scale-105"
            }`}>
            <PlusCircle size={18} /> {showForm ? "Cancel" : "Add One"}
          </button>
          <button onClick={() => { setShowForm(false); setShowUpload(!showUpload); }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition ${
              showUpload ? "bg-white/10 text-white" : "bg-policeGreen/20 text-policeGreen border border-policeGreen/30 hover:brightness-110"
            }`}>
            <Upload size={18} /> {showUpload ? "Close" : "Bulk Upload"}
          </button>
        </div>
      </div>

      {/* ─── BULK UPLOAD ─── */}
      {showUpload && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-heading font-bold text-policeGold">Bulk Upload Questions</h3>
            <a href="/sample-upload.csv" download className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-sm text-white font-semibold hover:bg-white/20 transition">
              <Download size={16} /> Download Template
            </a>
          </div>
          <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${
              dragOver ? "border-policeGold bg-policeGold/10" : "border-white/20 hover:border-policeGold/50 hover:bg-white/5"
            }`}>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={40} className="text-policeGold animate-spin" />
                <p className="text-white/70 font-semibold">Uploading and processing...</p>
              </div>
            ) : (
              <><FileUp size={48} className="text-policeGold mx-auto mb-4 opacity-60" />
                <p className="text-white font-semibold mb-1">Drop your CSV file here or click to browse</p>
                <p className="text-sm text-white/50">Only .csv files accepted. First row must be headers.</p>
              </>
            )}
          </div>
          {uploadResult && (
            <div className="space-y-4">
              <div className={`rounded-2xl p-5 border ${uploadResult.errors.length === 0 ? "bg-policeGreen/10 border-policeGreen/30"
                : uploadResult.inserted > 0 ? "bg-policeGold/10 border-policeGold/30" : "bg-policeRed/10 border-policeRed/30"}`}>
                <div className="flex items-center gap-3">
                  {uploadResult.errors.length === 0 ? <CheckCircle2 size={24} className="text-policeGreen" /> : <AlertTriangle size={24} className="text-policeGold" />}
                  <div>
                    <p className="font-bold text-white">{uploadResult.inserted > 0 ? `${uploadResult.inserted} of ${uploadResult.totalRows} questions uploaded` : "No questions were uploaded"}</p>
                    <p className="text-sm text-white/60">{uploadResult.errors.length > 0 ? `${uploadResult.errors.length} row(s) had errors` : "All rows processed successfully"}</p>
                  </div>
                </div>
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="bg-policeRed/5 border border-policeRed/20 rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-widest text-policeRed font-semibold mb-3">Error Details</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uploadResult.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-policeRed font-bold whitespace-nowrap">Row {err.row}:</span>
                        <span className="text-white/70">{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setUploadResult(null)} className="text-sm text-white/50 hover:text-white transition underline">Dismiss</button>
            </div>
          )}
          <details className="bg-black/30 rounded-xl p-4 border border-white/10">
            <summary className="flex items-center gap-2 text-sm text-white/70 font-semibold cursor-pointer hover:text-white"><FileText size={16} /> CSV Format Guide</summary>
            <div className="mt-4 space-y-2 text-sm text-white/60">
              <p><strong className="text-white">Required columns (in order):</strong></p>
              <code className="block bg-black/40 p-3 rounded-lg text-xs text-policeGold leading-relaxed">level,subject,year,question,option_a,option_b,option_c,option_d,correct_option,explanation[,option_e]</code>
              <ul className="space-y-1 ml-4 list-disc">
                <li><strong className="text-white">level</strong> — <code className="text-policeGold">jss3</code> or <code className="text-policeGold">ss3</code></li>
                <li><strong className="text-white">subject</strong> — Auto-created if it doesn't exist</li>
                <li><strong className="text-white">year</strong> — 2000 to current year + 2</li>
                <li><strong className="text-white">correct_option</strong> — <code className="text-policeGold">a</code>, <code className="text-policeGold">b</code>, <code className="text-policeGold">c</code>, <code className="text-policeGold">d</code>, or <code className="text-policeGold">e</code></li>
                <li><strong className="text-white">option_e</strong> — Optional, for 5-option questions</li>
              </ul>
            </div>
          </details>
        </div>
      )}

      {/* ─── SINGLE QUESTION FORM ─── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-5 question-form">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-xl font-heading font-bold text-policeGold">
              {editingId ? <><Pencil size={20} className="inline mr-2" /> Edit Question</> : <><PlusCircle size={20} className="inline mr-2" /> New Question</>}
            </h3>
            {editingId && <span className="text-[10px] uppercase tracking-widest bg-policeGold/10 text-policeGold px-3 py-1 rounded-full">ID: {editingId}</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Level</label>
              <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value, subject_id: null })}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition">
                <option value="jss3">JSS3</option><option value="ss3">SS3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Subject</label>
              <select value={formData.subject_id ?? ""} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" required>
                <option value="">Select Subject</option>
                {subjects.filter(s => s.level === formData.level).map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2"><CalendarDays size={12} className="inline mr-1" /> Year</label>
              <input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                min={2000} max={currentYear + 1} className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" required />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Question</label>
              <textarea value={formData.question} onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition min-h-[100px]" required placeholder="Enter the question..." />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
                <span className="mr-1">📖</span> Passage <span className="text-white/30">(optional — for comprehension questions)</span>
              </label>
              <textarea value={formData.passage} onChange={(e) => setFormData({ ...formData, passage: e.target.value })}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition min-h-[120px]" placeholder="Paste or type the reading passage here..." />
            </div>
            {(["a", "b", "c", "d", "e"] as const).map((option) => (
              <div key={option}>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Option {option.toUpperCase()}{option === 'e' ? ' (optional)' : ''}</label>
                <input type="text" value={formData[`option_${option}`]} onChange={(e) => setFormData({ ...formData, [`option_${option}`]: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" required={option !== 'e'} />
              </div>
            ))}
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Correct Answer</label>
              <select value={formData.correct_option} onChange={(e) => setFormData({ ...formData, correct_option: e.target.value as "a" | "b" | "c" | "d" | "e" })}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGreen rounded-xl px-4 py-3 text-white outline-none transition" required>
                {["a", "b", "c", "d", "e"].map(opt => <option key={opt} value={opt}>Option {opt.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Explanation</label>
              <textarea value={formData.explanation} onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition min-h-[80px]" required />
            </div>
          </div>
          <button type="submit" className="w-full py-4 rounded-xl bg-policeGold text-policeBlue font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition">
            {editingId ? 'Update Question' : 'Save Question'}
          </button>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* VIEW: SUBJECT GRID                                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {!selectedSubjectId && !loading && (
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="card text-center py-12"><p className="text-white/60">No questions found. Add one manually or use the Bulk Upload button above.</p></div>
          ) : subjectInfos.length === 0 ? (
            <div className="card text-center py-12"><p className="text-white/60">No subjects with questions yet.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectInfos.map((info) => (
                <button key={info.subject.id} onClick={() => handleSelectSubject(info.subject.id)}
                  className="group card text-left hover:border-policeGold/50 hover:bg-white/[0.07] transition-all active:scale-[0.98] cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-policeGold/20 flex items-center justify-center text-policeGold font-bold group-hover:scale-110 transition-transform">
                        {info.subject.name[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-policeGold transition-colors">{info.subject.name}</h3>
                        <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded font-semibold ${
                          info.subject.level === 'jss3' ? 'text-policeGreen bg-policeGreen/10' : 'text-policeGold bg-policeGold/10'
                        }`}>{info.subject.level.toUpperCase()}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-white/30 group-hover:text-policeGold group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-bold text-white">{info.totalQuestions}</span>
                    <span className="text-xs text-white/50">question{info.totalQuestions !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {info.years.map(year => (
                      <span key={year} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">{year}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* VIEW: SUBJECT DETAIL (year-grouped questions)                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {selectedSubjectId && !loading && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <button onClick={handleBackToSubjects} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition">
              <ArrowLeft size={16} /> All Subjects
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setDetailYearFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  detailYearFilter === "all" ? "bg-policeGold/20 text-policeGold border border-policeGold/30" : "bg-white/10 text-white/60 hover:text-white border border-white/10"
                }`}>All Years</button>
              {detailYears.map(year => (
                <button key={year} onClick={() => setDetailYearFilter(year)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    detailYearFilter === year ? "bg-policeGold/20 text-policeGold border border-policeGold/30" : "bg-white/10 text-white/60 hover:text-white border border-white/10"
                  }`}>{year}</button>
              ))}
            </div>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${getSubjectName(selectedSubjectId)}...`}
              className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl pl-9 pr-8 py-2 text-white text-sm outline-none transition placeholder-white/30" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition text-xs">✕</button>
            )}
          </div>

          {detailQuestions.length > 0 && (
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition">
                {selectAll ? <CheckSquare size={18} className="text-policeGold" /> : <Square size={18} />}
                {selectAll ? "Deselect All" : "Select All"}
              </button>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-policeRed font-semibold">{selectedIds.size} selected</span>
                  <button onClick={handleBatchDelete} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-policeRed/20 text-policeRed font-bold text-sm hover:bg-policeRed hover:text-white transition border border-policeRed/30">
                    <Trash2 size={16} /> Delete Selected
                  </button>
                  <button onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }} className="text-xs text-white/50 hover:text-white transition underline">Clear</button>
                </div>
              )}
              {selectedIds.size === 0 && <span className="text-xs text-white/30">Click checkboxes to select for batch delete</span>}
            </div>
          )}

          {detailQuestions.length === 0 && searchQuery && (
            <div className="card text-center py-12 border border-dashed border-policeGold/30">
              <Search size={40} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/70 font-semibold">No questions match &quot;{searchQuery}&quot;</p>
              <p className="text-sm text-white/50 mt-2">Try a different keyword or clear the search.</p>
              <button onClick={() => setSearchQuery("")} className="mt-4 px-5 py-2 rounded-xl bg-white/10 text-sm text-white font-semibold hover:bg-white/20 transition">Clear Search</button>
            </div>
          )}

          {detailQuestions.length === 0 && !searchQuery && (
            <div className="card text-center py-12"><p className="text-white/60">No questions for this subject yet.</p></div>
          )}

          {detailQuestions.length > 0 && Array.from(groupedDetailQuestions.keys()).sort((a, b) => b - a).map(year => (
            <div key={year} className="space-y-3">
              <div className="flex items-center gap-3 pt-2">
                <CalendarDays size={18} className="text-policeGold" />
                <h3 className="text-lg font-heading font-bold text-policeGold">{year}</h3>
                <span className="text-[10px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                  {groupedDetailQuestions.get(year)!.length} question{groupedDetailQuestions.get(year)!.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid gap-3">
                {groupedDetailQuestions.get(year)!.map((q) => {
                  const isSelected = q.id ? selectedIds.has(q.id) : false;
                  return (
                    <div key={q.id} className={`group rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-5 justify-between items-start transition-all ${
                      isSelected ? 'bg-policeRed/10 border-2 border-policeRed/40 shadow-[0_0_15px_rgba(220,38,38,0.15)]' : 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                    }`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button onClick={() => { if (q.id) { toggleSelect(q.id); if (selectAll) setSelectAll(false); } }}
                          className={`shrink-0 mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition ${
                            isSelected ? 'bg-policeRed border-policeRed text-white' : 'border-white/30 hover:border-policeRed/50 group-hover:border-white/50'
                          }`}>
                          {isSelected && <CheckCircle2 size={12} />}
                        </button>
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-policeGold bg-policeGold/10 px-2 py-1 rounded">{q.category}</span>
                            {q.level && (
                              <span className={`text-[10px] uppercase tracking-[0.3em] px-2 py-1 rounded font-semibold ${
                                q.level === 'jss3' ? 'text-policeGreen bg-policeGreen/10' : 'text-policeGold bg-policeGold/10'
                              }`}>{q.level.toUpperCase()}</span>
                            )}
                          </div>
                          <h4 className="text-base font-semibold text-white leading-snug">{q.question}</h4>
                          <p className="text-sm text-white/50 bg-black/30 p-3 rounded-lg border border-white/5">💡 {q.explanation}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleEdit(q)} className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition group" title="Edit question">
                          <Pencil size={18} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button onClick={() => q.id && handleDelete(q.id)} className="p-2.5 bg-policeRed/10 text-policeRed rounded-xl hover:bg-policeRed hover:text-white transition group" title="Delete question">
                          <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="text-center text-white/50 py-10">Loading questions...</p>}
    </div>
  );
}
