"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import {
  PlusCircle, Trash2, Upload, Download, Loader2, Edit3, Save, X,
  Clock, Zap, Flame, BookOpen, FileText, ChevronDown, ChevronUp, PenLine,
  Braces, Merge
} from "lucide-react";

type Subject = { id: number; name: string; department_id: number | null; level: string };
type DrillSet = {
  id: number;
  title: string;
  description: string;
  subject_id: number | null;
  level: string;
  time_limit_minutes: number;
  question_count: number;
  card_type?: string;
  capitalization_slug?: string;
  created_at: string;
};
type DrillQuestion = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_option: string;
  explanation: string;
  passage: string;
  instruction: string;
  question_number: number;
};

export default function AdminDrillsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [drillSets, setDrillSets] = useState<DrillSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [cardType, setCardType] = useState<"quiz" | "capitalization" | "sentence_types" | "sentence_combining">("quiz");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [level, setLevel] = useState<"jss3" | "ss3">("ss3");
  const [timeLimit, setTimeLimit] = useState(10);
  const [capitalizationSlug, setCapitalizationSlug] = useState("capitalization-basics");
  const [sentenceTypesSlug, setSentenceTypesSlug] = useState("sentence-types-basics");
  const [combiningSlug, setCombiningSlug] = useState("hamilton-sentence-combining");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [expandedSet, setExpandedSet] = useState<number | null>(null);

  // Question editing state
  const [setQuestions, setSetQuestions] = useState<DrillQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [editingQId, setEditingQId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingQ, setSavingQ] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const supabase = await getSupabase();
      const [subjRes, drillRes] = await Promise.all([
        supabase.from("subjects").select("*").order("name"),
        supabase.from("drill_sets").select("*").order("created_at", { ascending: false }),
      ]);
      setSubjects(subjRes.data || []);
      setDrillSets(drillRes.data || []);
    } catch { toast.error("Failed to load data."); }
    finally { setLoading(false); }
  };

  const getSubjectName = (id: number | null) => {
    if (!id) return "General";
    return subjects.find((s) => s.id === id)?.name || "General";
  };

  const resetForm = () => {
    setCardType("quiz");
    setTitle("");
    setDescription("");
    setSubjectName("");
    setLevel("ss3");
    setTimeLimit(10);
    setCapitalizationSlug("capitalization-basics");
    setSentenceTypesSlug("sentence-types-basics");
    setCombiningSlug("hamilton-sentence-combining");
    setCsvFile(null);
    setShowForm(false);
  };

  // Load questions for a drill set
  const loadSetQuestions = async (setId: number) => {
    setQuestionsLoading(true);
    setSetQuestions([]);
    try {
      const supabase = await getSupabase();
      const { data: links } = await supabase
        .from("drill_set_questions")
        .select("question_id, question_number")
        .eq("drill_set_id", setId)
        .order("question_number");

      if (links && links.length > 0) {
        const ids = links.map((l: any) => l.question_id);
        const { data: qData } = await supabase
          .from("questions")
          .select("*")
          .in("id", ids);

        const qMap = new Map<number, any>();
        for (const q of qData || []) qMap.set(q.id, q);

        const questions = links.map((l: any) => {
          const q = qMap.get(l.question_id);
          return q ? {
            id: q.id,
            question: q.question || "",
            option_a: q.option_a || "",
            option_b: q.option_b || "",
            option_c: q.option_c || "",
            option_d: q.option_d || "",
            option_e: q.option_e || "",
            correct_option: q.correct_option || "a",
            explanation: q.explanation || "",
            passage: q.passage || "",
            instruction: q.instruction || "",
            question_number: l.question_number,
          } : null;
        }).filter(Boolean) as DrillQuestion[];

        setSetQuestions(questions);
      }
    } catch {}
    setQuestionsLoading(false);
  };

  const handleToggleSet = async (setId: number) => {
    if (expandedSet === setId) {
      setExpandedSet(null);
      setSetQuestions([]);
      setEditingQId(null);
    } else {
      setExpandedSet(setId);
      setEditingQId(null);
      await loadSetQuestions(setId);
    }
  };

  // Edit a question
  const handleEditQ = (q: DrillQuestion) => {
    setEditingQId(q.id);
    setEditForm({
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e,
      correct_option: q.correct_option,
      explanation: q.explanation,
      instruction: q.instruction,
      passage: q.passage,
    });
  };

  const handleUpdateQ = async (qId: number) => {
    setSavingQ(true);
    try {
      const supabase = await getSupabase();
      const { error } = await supabase
        .from("questions")
        .update({
          question: editForm.question,
          option_a: editForm.option_a,
          option_b: editForm.option_b,
          option_c: editForm.option_c,
          option_d: editForm.option_d,
          option_e: editForm.option_e || "",
          correct_option: editForm.correct_option,
          explanation: editForm.explanation,
          instruction: editForm.instruction || "",
          passage: editForm.passage || "",
        })
        .eq("id", qId);
      if (error) throw error;
      toast.success("Question updated!");
      setEditingQId(null);
      if (expandedSet) loadSetQuestions(expandedSet);
    } catch { toast.error("Update failed."); }
    setSavingQ(false);
  };

  const handleDeleteQ = async (qId: number) => {
    if (!confirm("Delete this question from the drill set?")) return;
    try {
      const supabase = await getSupabase();
      // Remove from drill_set_questions
      await supabase.from("drill_set_questions").delete().eq("question_id", qId);
      toast.success("Question removed from drill set.");
      if (expandedSet) { loadSetQuestions(expandedSet); loadData(); }
    } catch { toast.error("Delete failed."); }
  };

  // Create a lesson card (no CSV needed — lesson + answers come from the
  // server-only lesson store keyed by the slug).
  const handleCreateLessonCard = async () => {
    if (!title.trim()) { toast.error("Title is required."); return; }
    const slug = (
      cardType === "sentence_types" ? sentenceTypesSlug
      : cardType === "sentence_combining" ? combiningSlug
      : capitalizationSlug
    ).trim();
    if (!slug) { toast.error("A lesson slug is required."); return; }
    setSubmitting(true);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("drill_sets")
        .insert({
          title: title.trim(),
          description: description.trim(),
          subject_id: null,
          level,
          time_limit_minutes: timeLimit,
          question_count: cardType === "sentence_types" ? 19 : 5,
          card_type: cardType,
          lesson_content: "",
          capitalization_slug: slug,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success(`Lesson card "${data.title}" created!`);
      resetForm();
      loadData();
    } catch (e: any) {
      toast.error(e?.message || "Create failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) { toast.error("Title is required."); return; }
    if (!csvFile) { toast.error("Please select a CSV file."); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", csvFile);
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("time_limit_minutes", String(timeLimit));
      fd.append("level", level);
      fd.append("subject_name", subjectName.trim());

      const res = await fetch("/api/drills/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) { toast.error(data.error || "Upload failed."); return; }

      toast.success(`Drill set "${data.drillSet.title}" created with ${data.inserted} questions!`);
      if (data.errors?.length > 0) {
        toast.error(`${data.errors.length} row(s) had errors.`);
      }
      resetForm();
      loadData();
    } catch { toast.error("Upload failed."); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this drill set and all its data? This cannot be undone.")) return;
    try {
      const supabase = await getSupabase();
      await supabase.from("drill_sets").delete().eq("id", id);
      toast.success("Drill set deleted.");
      setExpandedSet(null);
      setSetQuestions([]);
      loadData();
    } catch { toast.error("Delete failed."); }
  };

  const downloadTemplate = () => {
    const csv = 'question,option_a,option_b,option_c,option_d,correct_option,explanation,instruction\n"What is 2+2?","3","4","5","6","b","2+2 equals 4","Solve the following math problems."\n';
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drill-questions-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const optionKeys = ["a","b","c","d","e"] as const;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ─── HEADER ─── */}
      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500/20 p-3 rounded-full text-orange-400"><Flame size={28} /></div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-white">Drill Sets</h2>
            <p className="text-sm text-white/50">{drillSets.length} timed drill set{drillSets.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadTemplate}
            className="px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition bg-policeGreen/20 text-policeGreen border border-policeGreen/30 hover:bg-policeGreen/30">
            <Download size={18} /> CSV Template
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition ${
              showForm ? "bg-white/10 text-white" : "bg-policeGold text-policeBlue hover:scale-105"
            }`}>
            <PlusCircle size={18} /> {showForm ? "Cancel" : "New Drill Set"}
          </button>
        </div>
      </div>

      {/* ─── CREATE FORM ─── */}
      {showForm && (
        <div className="card space-y-5 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-policeRed/5">
          <div className="flex items-center gap-3 pb-2 border-b border-white/10">
            {cardType === "capitalization" ? <PenLine size={22} className="text-violet-400" /> : cardType === "sentence_types" ? <Braces size={22} className="text-teal-400" /> : cardType === "sentence_combining" ? <Merge size={22} className="text-sky-400" /> : <Zap size={22} className="text-orange-400" />}
            <h3 className="text-lg font-heading font-bold text-orange-400">
              {cardType === "capitalization" ? "Create Capitalization Lesson Card" : cardType === "sentence_types" ? "Create Sentence Types Lesson Card" : cardType === "sentence_combining" ? "Create Sentence Combining Lesson Card" : "Create Timed Drill Set"}
            </h3>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Card Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button type="button" onClick={() => setCardType("quiz")}
                className={`rounded-xl px-4 py-3 text-sm font-bold border transition ${
                  cardType === "quiz"
                    ? "border-orange-400/60 bg-orange-500/15 text-orange-300"
                    : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                }`}>
                🔥 Timed Drill (MCQ)
              </button>
              <button type="button" onClick={() => setCardType("capitalization")}
                className={`rounded-xl px-4 py-3 text-sm font-bold border transition ${
                  cardType === "capitalization"
                    ? "border-violet-400/60 bg-violet-500/15 text-violet-300"
                    : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                }`}>
                ✍️ Capitalization
              </button>
              <button type="button" onClick={() => setCardType("sentence_types")}
                className={`rounded-xl px-4 py-3 text-sm font-bold border transition ${
                  cardType === "sentence_types"
                    ? "border-teal-400/60 bg-teal-500/15 text-teal-300"
                    : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                }`}>
                🧩 Sentence Types
              </button>
              <button type="button" onClick={() => setCardType("sentence_combining")}
                className={`rounded-xl px-4 py-3 text-sm font-bold border transition ${
                  cardType === "sentence_combining"
                    ? "border-sky-400/60 bg-sky-500/15 text-sky-300"
                    : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                }`}>
                🔗 Sentence Combining
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Card Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={cardType === "capitalization" ? "e.g. Capitalization Basics" : "e.g. Mathematics Speed Drill"}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" />
            </div>
            {cardType !== "quiz" ? (
              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
                  {cardType === "capitalization" ? <PenLine size={12} className="inline mr-1 text-violet-400" /> : cardType === "sentence_types" ? <Braces size={12} className="inline mr-1 text-teal-400" /> : <Merge size={12} className="inline mr-1 text-sky-400" />} Lesson Slug
                </label>
                {cardType === "capitalization" ? (
                  <input type="text" value={capitalizationSlug} onChange={(e) => setCapitalizationSlug(e.target.value)}
                    placeholder="capitalization-basics"
                    className="w-full bg-black/40 border border-white/10 focus:border-violet-400 rounded-xl px-4 py-3 text-white outline-none transition" />
                ) : cardType === "sentence_types" ? (
                  <input type="text" value={sentenceTypesSlug} onChange={(e) => setSentenceTypesSlug(e.target.value)}
                    placeholder="sentence-types-basics"
                    className="w-full bg-black/40 border border-white/10 focus:border-teal-400 rounded-xl px-4 py-3 text-white outline-none transition" />
                ) : (
                  <input type="text" value={combiningSlug} onChange={(e) => setCombiningSlug(e.target.value)}
                    placeholder="hamilton-sentence-combining"
                    className="w-full bg-black/40 border border-white/10 focus:border-sky-400 rounded-xl px-4 py-3 text-white outline-none transition" />
                )}
                <p className="text-[10px] text-white/30 mt-1">
                  The lesson note &amp; hidden answers come from the server-only lesson store. Available slug:{" "}
                  <code className={cardType === "capitalization" ? "text-violet-300" : cardType === "sentence_types" ? "text-teal-300" : "text-sky-300"}>
                    {cardType === "capitalization" ? "capitalization-basics" : cardType === "sentence_types" ? "sentence-types-basics" : "hamilton-sentence-combining"}
                  </code>
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Subject</label>
                <input type="text" value={subjectName} onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Mathematics (auto-created if new)"
                  className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" />
              </div>
            )}
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value as "jss3" | "ss3")}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition">
                <option value="jss3">JSS3</option>
                <option value="ss3">SS3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
                <Clock size={12} className="inline mr-1" /> Time Limit (minutes)
              </label>
              <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Math.max(1, parseInt(e.target.value) || 1))}
                min={1} max={180}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this card about?"
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition min-h-[60px]" />
            </div>
          </div>

          {cardType === "quiz" && (
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
              <span className="text-orange-400">Questions CSV</span>
            </label>
            <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl px-4 py-5 cursor-pointer transition ${
              csvFile ? "border-policeGreen/50 bg-policeGreen/5" : "border-orange-400/40 hover:border-orange-400/70 bg-orange-500/5 hover:bg-orange-500/10"
            }`}>
              <Upload size={28} className={csvFile ? "text-policeGreen" : "text-orange-400"} />
              <div>
                <span className={`text-sm font-semibold block ${csvFile ? "text-policeGreen" : "text-orange-400"}`}>
                  {csvFile ? csvFile.name : "Choose CSV File"}
                </span>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
            </label>
            {csvFile && (
              <button onClick={() => { setCsvFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="mt-1 text-[10px] text-red-400 hover:text-red-300 transition">✕ Remove file</button>
            )}
          </div>
          )}

          {cardType === "quiz" && (
          <details className="bg-black/30 rounded-xl p-4 border border-orange-500/20">
            <summary className="flex items-center gap-2 text-xs text-orange-300 font-semibold cursor-pointer hover:text-orange-200">
              <FileText size={14} /> CSV Format Guide
            </summary>
            <div className="mt-4 space-y-2 text-xs text-white/60">
              <p><strong className="text-white">Required columns (in order):</strong></p>
              <code className="block bg-black/40 p-3 rounded-lg text-[11px] text-orange-300 leading-relaxed overflow-x-auto whitespace-nowrap">
                question,option_a,option_b,option_c,option_d,correct_option,explanation[,option_e][,passage][,instruction]
              </code>
              <ul className="space-y-1 ml-4 list-disc">
                <li><strong className="text-white">correct_option</strong> — One of: a, b, c, d, e</li>
                <li><strong className="text-white">option_e</strong> — Optional 5th option</li>
                <li><strong className="text-white">passage</strong> — Optional reading passage</li>
                <li><strong className="text-white">instruction</strong> — Optional section instruction shown to students</li>
              </ul>
            </div>
          </details>
          )}

          <button onClick={cardType !== "quiz" ? handleCreateLessonCard : handleUpload} disabled={submitting}
            className={`w-full py-4 rounded-xl text-white font-bold hover:brightness-110 transition flex items-center justify-center gap-2 disabled:opacity-50 ${
              cardType === "capitalization" ? "bg-violet-500 hover:bg-violet-400" : cardType === "sentence_types" ? "bg-teal-500 hover:bg-teal-400" : cardType === "sentence_combining" ? "bg-sky-500 hover:bg-sky-400" : "bg-orange-500 hover:bg-orange-400"
            }`}>
            {submitting ? <Loader2 size={20} className="animate-spin" /> : cardType === "capitalization" ? <PenLine size={20} /> : cardType === "sentence_types" ? <Braces size={20} /> : cardType === "sentence_combining" ? <Merge size={20} /> : <Zap size={20} />}
            {submitting
              ? "Creating Card..."
              : (cardType === "capitalization" ? "Create Capitalization Card" : cardType === "sentence_types" ? "Create Sentence Types Card" : cardType === "sentence_combining" ? "Create Sentence Combining Card" : "Create Drill Set")}
          </button>
        </div>
      )}

      {/* ─── DRILL SETS LIST ─── */}
      {loading ? (
        <div className="text-center py-20 text-white/50">Loading drill sets...</div>
      ) : drillSets.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No drill sets yet. Create one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drillSets.map((set) => (
            <div key={set.id} className={`rounded-2xl border transition ${
              expandedSet === set.id ? "border-orange-500/30 bg-orange-500/5" : "border-white/10 bg-white/5 hover:border-white/20"
            }`}>
              <div className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => handleToggleSet(set.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                    {set.title[0]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{set.title}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <span>{getSubjectName(set.subject_id)}</span>
                      <span>•</span>
                      <span className="uppercase">{set.level}</span>
                      <span>•</span>
                      <span>{set.question_count} {set.card_type === "capitalization" || set.card_type === "sentence_types" || set.card_type === "sentence_combining" ? "chunks" : "questions"}</span>
                      <span>•</span>
                      <span><Clock size={10} className="inline" /> {set.time_limit_minutes}m</span>
                      {set.card_type === "capitalization" && (
                        <span className="text-[9px] font-bold uppercase tracking-widest bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full">
                          ✍️ Capitalization
                        </span>
                      )}
                      {set.card_type === "sentence_types" && (
                        <span className="text-[9px] font-bold uppercase tracking-widest bg-teal-500/15 text-teal-300 px-2 py-0.5 rounded-full">
                          🧩 Sentence Types
                        </span>
                      )}
                      {set.card_type === "sentence_combining" && (
                        <span className="text-[9px] font-bold uppercase tracking-widest bg-sky-500/15 text-sky-300 px-2 py-0.5 rounded-full">
                          🔗 Sentence Combining
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(set.id); }}
                    className="p-2 bg-white/10 rounded-lg text-white/60 hover:text-policeRed hover:bg-policeRed/20 transition">
                    <Trash2 size={14} />
                  </button>
                  {expandedSet === set.id ? <ChevronUp size={18} className="text-white/40" /> : <ChevronDown size={18} className="text-white/40" />}
                </div>
              </div>

              {expandedSet === set.id && (
                <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
                  {set.description && <p className="text-sm text-white/60">{set.description}</p>}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-black/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{set.card_type === "capitalization" || set.card_type === "sentence_types" || set.card_type === "sentence_combining" ? "Chunks" : "Questions"}</p>
                      <p className="text-xl font-bold text-white">{set.question_count}</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Time Limit</p>
                      <p className="text-xl font-bold text-orange-400">{set.time_limit_minutes}m</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Created</p>
                      <p className="text-lg font-bold text-white/70">{formatDate(set.created_at)}</p>
                    </div>
                  </div>

                  {/* ─── QUESTIONS LIST ─── */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-widest font-semibold pt-2">
                      <FileText size={12} /> {set.card_type === "capitalization" ? "Practice Sentences" : set.card_type === "sentence_combining" ? "Passage Chunks" : "Questions"}
                    </div>
                    {set.card_type === "capitalization" || set.card_type === "sentence_types" || set.card_type === "sentence_combining" ? (
                      <div className={`${
                        set.card_type === "sentence_types"
                          ? "bg-teal-500/10 border-teal-500/25"
                          : set.card_type === "sentence_combining"
                            ? "bg-sky-500/10 border-sky-500/25"
                            : "bg-violet-500/10 border-violet-500/25"
                      } border rounded-xl p-4 space-y-2`}>
                        <p className="text-sm text-white/80 font-semibold flex items-center gap-2">
                          {set.card_type === "sentence_types"
                            ? <Braces size={14} className="text-teal-300" />
                            : set.card_type === "sentence_combining"
                              ? <Merge size={14} className="text-sky-300" />
                              : <PenLine size={14} className="text-violet-300" />}
                          {set.card_type === "sentence_types"
                            ? "Sentence types lesson card"
                            : set.card_type === "sentence_combining"
                              ? "Sentence combining lesson card"
                              : "Capitalization lesson card"}
                        </p>
                        <p className="text-xs text-white/60 leading-relaxed">
                          This card type doesn't use quiz questions. The lesson note and the practice{" "}
                          {set.card_type === "sentence_combining" ? "passage chunks" : "sentences"}
                          (with their hidden answers) are managed in the server-only lesson store, keyed by slug{" "}
                          <code className={`bg-black/40 px-1.5 py-0.5 rounded ${
                            set.card_type === "sentence_types" ? "text-teal-300" : set.card_type === "sentence_combining" ? "text-sky-300" : "text-violet-300"
                          }`}>{set.capitalization_slug || "—"}</code>.
                          Students rewrite the chunks and get them checked against the hidden answers — no quiz questions needed.
                        </p>
                      </div>
                    ) : questionsLoading ? (
                      <div className="flex items-center gap-2 py-4 text-white/50 text-sm">
                        <Loader2 size={14} className="animate-spin" /> Loading questions...
                      </div>
                    ) : setQuestions.length === 0 ? (
                      <p className="text-white/30 text-sm py-2">No questions in this set.</p>
                    ) : (
                      setQuestions.map((q) => (
                        <div key={q.id}>
                          {/* Question display */}
                          {editingQId !== q.id ? (
                            <div className="flex items-start gap-3 bg-white/5 rounded-xl p-4 border border-white/10 group hover:border-white/20 transition">
                              <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/50 shrink-0 mt-0.5">
                                {q.question_number}
                              </span>
                              <div className="flex-1 min-w-0 space-y-2">
                                <p className="text-sm font-medium text-white/90 leading-snug">{q.question}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {optionKeys.map(k => {
                                    const val = q[`option_${k}` as keyof DrillQuestion];
                                    if (!val && k === "e") return null;
                                    const isCorrect = k === q.correct_option;
                                    return (
                                      <span key={k} className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                        isCorrect ? "bg-policeGreen/20 text-policeGreen" : "bg-white/10 text-white/50"
                                      }`}>
                                        {k.toUpperCase()}. {val}
                                      </span>
                                    );
                                  })}
                                </div>
                                {q.instruction && (
                                  <p className="text-[10px] text-policeGold/60 bg-policeGold/5 rounded px-2 py-1">📋 {q.instruction.substring(0, 80)}{q.instruction.length > 80 ? "..." : ""}</p>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => handleEditQ(q)}
                                  className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition">
                                  <Edit3 size={13} />
                                </button>
                                <button onClick={() => handleDeleteQ(q.id)}
                                  className="p-1.5 bg-policeRed/10 text-policeRed rounded-lg hover:bg-policeRed hover:text-white transition">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ─── INLINE EDIT FORM ─── */
                            <div className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-2 border-blue-500/30 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-400">Editing Q{q.question_number}</span>
                                <button onClick={() => setEditingQId(null)} className="p-1 rounded-lg hover:bg-white/10 transition">
                                  <X size={16} className="text-white/50" />
                                </button>
                              </div>
                              <textarea value={editForm.question} onChange={(e) => setEditForm({...editForm, question: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 focus:border-blue-400 rounded-xl px-4 py-2.5 text-white text-sm outline-none min-h-[60px]" />
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {optionKeys.map(k => (
                                  <input key={k} type="text" value={editForm[`option_${k}`] || ""}
                                    onChange={(e) => setEditForm({...editForm, [`option_${k}`]: e.target.value})}
                                    placeholder={`Option ${k.toUpperCase()}${k === 'e' ? ' (opt)' : ''}`}
                                    className="bg-black/40 border border-white/10 focus:border-blue-400 rounded-lg px-3 py-2 text-white text-xs outline-none" />
                                ))}
                              </div>
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <label className="text-[9px] uppercase tracking-widest text-white/50 mb-1 block">Answer</label>
                                  <select value={editForm.correct_option} onChange={(e) => setEditForm({...editForm, correct_option: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none">
                                    {optionKeys.map(k => <option key={k} value={k}>Option {k.toUpperCase()}</option>)}
                                  </select>
                                </div>
                                <div className="flex-[2]">
                                  <label className="text-[9px] uppercase tracking-widest text-white/50 mb-1 block">Explanation</label>
                                  <input type="text" value={editForm.explanation || ""}
                                    onChange={(e) => setEditForm({...editForm, explanation: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none" />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input type="text" value={editForm.instruction || ""}
                                  onChange={(e) => setEditForm({...editForm, instruction: e.target.value})}
                                  placeholder="Instruction (optional)"
                                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none" />
                                <input type="text" value={editForm.passage || ""}
                                  onChange={(e) => setEditForm({...editForm, passage: e.target.value})}
                                  placeholder="Passage (optional)"
                                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none" />
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => handleUpdateQ(q.id)} disabled={savingQ}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-400 transition disabled:opacity-50">
                                  {savingQ ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                  Save
                                </button>
                                <button onClick={() => setEditingQId(null)}
                                  className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-xs hover:bg-white/20 transition">Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="text-[10px] text-white/30 pt-2">
                    Secret URL: <code className="text-policeGold bg-black/40 px-2 py-0.5 rounded">/drill</code>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
