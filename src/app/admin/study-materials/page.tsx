"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import {
  PlusCircle, Trash2, Edit3, Save, X, Check,
  BookOpen, Layers, FileText, ChevronDown, ChevronUp,
  ChevronRight, ArrowLeft, Upload, Download, Loader2,
  FolderOpen, GripVertical, Eye, EyeOff
} from "lucide-react";

type Subject = { id: number; name: string; department_id: number | null; level: string };
type StudyMaterial = {
  id: number; subject_id: number; title: string;
  description: string; level: string; created_at: string;
};
type MaterialLevel = {
  id: number; material_id: number; title: string;
  description: string; level_number: number; created_at: string;
};
type MaterialCard = {
  id: number; level_id: number; front: string;
  back: string; card_number: number; created_at: string;
};

export default function AdminStudyMaterialsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [levels, setLevels] = useState<MaterialLevel[]>([]);
  const [cards, setCards] = useState<MaterialCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // Form states
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showLevelForm, setShowLevelForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Material form
  const [matTitle, setMatTitle] = useState("");
  const [matDescription, setMatDescription] = useState("");
  const [matSubject, setMatSubject] = useState<number | null>(null);

  // Level form
  const [lvlTitle, setLvlTitle] = useState("");
  const [lvlDescription, setLvlDescription] = useState("");

  // Card form
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");

  // CSV Import for cards
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk import form state (create material + levels + questions from CSVs in one go)
  const [showImportForm, setShowImportForm] = useState(false);
  const [importSubject, setImportSubject] = useState<number | null>(null);
  const [importTitle, setImportTitle] = useState("");
  const [importDescription, setImportDescription] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabase = await getSupabase();
      const [subjRes, matRes, lvlRes, cardRes] = await Promise.all([
        supabase.from("subjects").select("*").order("name"),
        supabase.from("study_materials").select("*").order("title"),
        supabase.from("material_levels").select("*").order("level_number"),
        supabase.from("material_cards").select("*").order("card_number"),
      ]);

      setSubjects(subjRes.data || []);
      setMaterials(matRes.data || []);
      setLevels(lvlRes.data || []);
      setCards(cardRes.data || []);
    } catch { toast.error("Failed to load data."); }
    finally { setLoading(false); }
  };

  // Filtered lists
  const filteredLevels = selectedMaterial
    ? levels.filter((l) => l.material_id === selectedMaterial)
    : [];
  const filteredCards = selectedLevel
    ? cards.filter((c) => c.level_id === selectedLevel)
    : [];

  const getSubjectName = (id: number) => subjects.find((s) => s.id === id)?.name || "Unknown";

  // ─── CRUD: Materials ─────────────────────────────
  const resetMaterialForm = () => {
    setMatTitle("");
    setMatDescription("");
    setMatSubject(null);
    setEditingId(null);
    setShowMaterialForm(false);
  };

  const handleEditMaterial = (mat: StudyMaterial) => {
    setMatTitle(mat.title);
    setMatDescription(mat.description);
    setMatSubject(mat.subject_id);
    setEditingId(mat.id);
    setShowMaterialForm(true);
  };

  const handleSaveMaterial = async () => {
    if (!matTitle.trim() || !matSubject) { toast.error("Title and subject required."); return; }
    const supabase = await getSupabase();
    const payload = {
      subject_id: matSubject,
      title: matTitle.trim(),
      description: matDescription.trim(),
      level: "ss3",
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("study_materials").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Material updated!");
      } else {
        const { error } = await supabase.from("study_materials").insert(payload);
        if (error) throw error;
        toast.success("Material created!");
      }
      resetMaterialForm();
      loadData();
    } catch (e: any) { toast.error(e?.message || "Save failed."); }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!confirm("Delete this material and all its levels and cards?")) return;
    try {
      const supabase = await getSupabase();
      await supabase.from("study_materials").delete().eq("id", id);
      toast.success("Material deleted.");
      if (selectedMaterial === id) { setSelectedMaterial(null); setSelectedLevel(null); }
      loadData();
    } catch { toast.error("Delete failed."); }
  };

  // ─── CRUD: Levels ────────────────────────────────
  const resetLevelForm = () => {
    setLvlTitle("");
    setLvlDescription("");
    setEditingId(null);
    setShowLevelForm(false);
  };

  const handleEditLevel = (lvl: MaterialLevel) => {
    setLvlTitle(lvl.title);
    setLvlDescription(lvl.description);
    setEditingId(lvl.id);
    setShowLevelForm(true);
  };

  const handleSaveLevel = async () => {
    if (!lvlTitle.trim() || !selectedMaterial) return;
    const supabase = await getSupabase();
    const nextNumber = editingId
      ? levels.find((l) => l.id === editingId)?.level_number || 1
      : (filteredLevels.length > 0
          ? Math.max(...filteredLevels.map((l) => l.level_number)) + 1
          : 1);

    const payload = {
      material_id: selectedMaterial,
      title: lvlTitle.trim(),
      description: lvlDescription.trim(),
      level_number: nextNumber,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("material_levels").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Level updated!");
      } else {
        const { error } = await supabase.from("material_levels").insert(payload);
        if (error) throw error;
        toast.success("Level added!");
      }
      resetLevelForm();
      loadData();
    } catch (e: any) { toast.error(e?.message || "Save failed."); }
  };

  const handleDeleteLevel = async (id: number) => {
    if (!confirm("Delete this level and all its cards?")) return;
    try {
      const supabase = await getSupabase();
      await supabase.from("material_levels").delete().eq("id", id);
      toast.success("Level deleted.");
      if (selectedLevel === id) setSelectedLevel(null);
      loadData();
    } catch { toast.error("Delete failed."); }
  };

  // ─── CRUD: Cards ─────────────────────────────────
  const resetCardForm = () => {
    setCardFront("");
    setCardBack("");
    setEditingId(null);
    setShowCardForm(false);
  };

  const handleEditCard = (card: MaterialCard) => {
    setCardFront(card.front);
    setCardBack(card.back);
    setEditingId(card.id);
    setShowCardForm(true);
  };

  const handleSaveCard = async () => {
    if (!cardFront.trim() || !selectedLevel) return;
    const supabase = await getSupabase();
    const nextNumber = editingId
      ? cards.find((c) => c.id === editingId)?.card_number || 1
      : (filteredCards.length > 0
          ? Math.max(...filteredCards.map((c) => c.card_number)) + 1
          : 1);

    const payload = {
      level_id: selectedLevel,
      front: cardFront.trim(),
      back: cardBack.trim(),
      card_number: nextNumber,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("material_cards").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Card updated!");
      } else {
        const { error } = await supabase.from("material_cards").insert(payload);
        if (error) throw error;
        toast.success("Card added!");
      }
      resetCardForm();
      loadData();
    } catch (e: any) { toast.error(e?.message || "Save failed."); }
  };

  const handleDeleteCard = async (id: number) => {
    if (!confirm("Delete this card?")) return;
    try {
      const supabase = await getSupabase();
      await supabase.from("material_cards").delete().eq("id", id);
      toast.success("Card deleted.");
      loadData();
    } catch { toast.error("Delete failed."); }
  };

  // CSV Import for cards is now done at the material level (see inline handler above)
  // Cards can also be added individually per-level via the Add Card button
  const downloadCardTemplate = () => {
    const csv = 'front,back\n"What is Newton\'s First Law?","An object at rest stays at rest..."\n"What is Photosynthesis?","The process by which plants..."';
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cards-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── DEDUPLICATED SUBJECTS ─────────────────────
  // Group subjects by name to avoid duplicates (same subject for different departments/levels)
  // IMPORTANT: hooks must be BEFORE any early return
  const uniqueSubjects = useMemo(() => {
    const seen = new Map<string, Subject>();
    for (const s of subjects) {
      if (!seen.has(s.name)) {
        seen.set(s.name, s);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects]);

  // Only show subjects that have at least one study material
  const subjectsWithMaterials = useMemo(() => {
    const materialSubjectIds = new Set(materials.map(m => m.subject_id).filter(Boolean));
    const materialSubjectNames = new Set(
      subjects
        .filter(s => materialSubjectIds.has(s.id))
        .map(s => s.name)
    );
    return uniqueSubjects.filter(s => materialSubjectNames.has(s.name));
  }, [uniqueSubjects, materials, subjects]);

  // Filter materials by subject NAME (not ID — to handle duplicate subject entries)
  const filteredMaterials = useMemo(() => {
    if (!selectedSubject) return materials;
    const selectedName = subjects.find(s => s.id === selectedSubject)?.name;
    if (!selectedName) return materials;
    // Get ALL subject IDs that share this name (handles duplicates)
    const matchingIds = new Set(
      subjects.filter(s => s.name === selectedName).map(s => s.id)
    );
    return materials.filter(m => m.subject_id && matchingIds.has(m.subject_id));
  }, [materials, selectedSubject, subjects]);

  // ─── RENDER ──────────────────────────────────────
  if (loading) {
    return <div className="text-center py-20 text-white/50">Loading study materials...</div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ─── HEADER ─── */}
      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-policeGold/20 p-3 rounded-full text-policeGold"><BookOpen size={28} /></div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-white">Study Materials</h2>
            <p className="text-sm text-white/50">
              {selectedSubject
                ? `${filteredMaterials.length} materials for ${getSubjectName(selectedSubject)}`
                : `${materials.length} materials`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowImportForm(!showImportForm); setShowMaterialForm(false); }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition ${
              showImportForm ? "bg-white/10 text-white" : "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
            }`}>
            <Upload size={18} /> {showImportForm ? "Cancel" : "Import from CSV"}
          </button>
          <button onClick={() => { resetMaterialForm(); setShowMaterialForm(!showMaterialForm); setShowImportForm(false); }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition ${
              showMaterialForm ? "bg-white/10 text-white" : "bg-policeGold text-policeBlue hover:scale-105"
            }`}>
            <PlusCircle size={18} /> {showMaterialForm ? "Cancel" : "New Material"}
          </button>
        </div>
      </div>

      {/* ─── SUBJECT FILTER (deduplicated) ─── */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedSubject(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            !selectedSubject ? "bg-policeGold/20 text-policeGold border border-policeGold/30" : "bg-white/10 text-white/60 hover:text-white"
          }`}>All Subjects</button>
        {subjectsWithMaterials.map((s) => (
          <button key={s.id} onClick={() => { setSelectedSubject(s.id); setSelectedMaterial(null); setSelectedLevel(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedSubject === s.id ? "bg-policeGold/20 text-policeGold border border-policeGold/30" : "bg-white/10 text-white/60 hover:text-white"
            }`}>{s.name}</button>
        ))}
      </div>

      {/* ─── BULK IMPORT FORM (single CSV with all levels + cards + questions) ─── */}
      {showImportForm && (
        <div className="card space-y-5 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-indigo-500/5">
          <div className="flex items-center gap-3 pb-2 border-b border-white/10">
            <Upload size={22} className="text-blue-400" />
            <h3 className="text-lg font-heading font-bold text-blue-400">Import Study Material — One CSV to Rule Them All</h3>
          </div>
          <p className="text-xs text-white/50 -mt-2">
            Upload a <strong>single CSV</strong> with your levels, cards, and questions. The system will automatically
            create the material, all levels, import cards, import questions, and link everything together.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Subject</label>
              <select value={importSubject ?? ""} onChange={(e) => setImportSubject(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-black/40 border border-white/10 focus:border-blue-400 rounded-xl px-4 py-3 text-white outline-none transition">
                <option value="">Select Subject</option>
                {uniqueSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Title (auto-filled from filename)</label>
              <input type="text" value={importTitle} onChange={(e) => setImportTitle(e.target.value)}
                placeholder="Will be derived from CSV filename"
                className="w-full bg-black/40 border border-white/10 focus:border-blue-400 rounded-xl px-4 py-3 text-white outline-none transition" />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
              <span className="text-blue-400">Combined CSV File</span>
            </label>
            <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-blue-400/40 hover:border-blue-400/70 rounded-xl px-4 py-5 cursor-pointer bg-blue-500/5 hover:bg-blue-500/10 transition">
              <Upload size={28} className="text-blue-400" />
              <div>
                <span className="text-sm text-blue-400 font-semibold block">{importFile ? importFile.name : 'Choose CSV File'}</span>
                {importFile && <span className="text-xs text-blue-300/60">Click to change file</span>}
              </div>
              <input ref={importFileRef} type="file" accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImportFile(file);
                  if (file) {
                    const name = file.name
                      .replace(/\.csv$/i, '')
                      .replace(/[-_]/g, ' ')
                      .replace(/^import[- ]?(unilorin[- ])?/i, '')
                      .replace(/^cards[- ]?/i, '')
                      .replace(/study[- ]?/i, '')
                      .trim();
                    setImportTitle(prev => prev || name);
                  }
                }} />
            </label>
            {importFile && (
              <button onClick={() => { setImportFile(null); if (importFileRef.current) importFileRef.current.value = ''; }}
                className="mt-1 text-[10px] text-red-400 hover:text-red-300 transition">✕ Remove file</button>
            )}
          </div>

          {/* CSV Format Guide */}
          <details className="bg-black/30 rounded-xl p-4 border border-blue-500/20">
            <summary className="flex items-center gap-2 text-xs text-blue-300 font-semibold cursor-pointer hover:text-blue-200">
              <FileText size={14} /> CSV Format Guide — How to Structure Your File
            </summary>
            <div className="mt-4 space-y-3 text-xs text-white/60">
              <p><strong className="text-white">Required columns (in order):</strong></p>
              <code className="block bg-black/40 p-3 rounded-lg text-[11px] text-blue-300 leading-relaxed overflow-x-auto whitespace-nowrap">
level_number,level_title,type,front,back,question,option_a,option_b,option_c,option_d,option_e,correct_option,explanation
              </code>
              <ul className="space-y-1.5 ml-4 list-disc">
                <li><strong className="text-white">level_number</strong> — Groups rows into levels (e.g., 1, 2, 3...)</li>
                <li><strong className="text-white">level_title</strong> — Display name for each level</li>
                <li><strong className="text-white">type</strong> — <code className="text-blue-300">card</code> or <code className="text-blue-300">question</code></li>
                <li><strong className="text-white">front</strong> / <strong className="text-white">back</strong> — For card rows only</li>
                <li><strong className="text-white">question</strong> / <strong className="text-white">option_a</strong>... — For question rows only</li>
                <li><strong className="text-white">option_e</strong> — Optional, for 5-option questions</li>
              </ul>
              <p className="mt-3"><strong className="text-white">💡 Example:</strong> One CSV can have Level 1 cards + Level 1 questions, Level 2 cards + Level 2 questions, etc.</p>
            </div>
          </details>

          <div className="flex gap-3 pt-2">
            <button onClick={async () => {
              if (!importSubject) { toast.error("Please select a subject."); return; }
              if (!importFile) { toast.error("Please select a CSV file."); return; }
              const title = importTitle.trim() || `Imported Material (${new Date().toLocaleDateString()})`;
              
              setImporting(true);
              try {
                const supabase = await getSupabase();
                
                // 1. Create the study material
                const { data: material, error: mError } = await supabase
                  .from("study_materials")
                  .insert({
                    subject_id: importSubject,
                    title,
                    description: importDescription.trim(),
                    level: "ss3",
                  })
                  .select()
                  .single();
                if (mError) throw mError;
                
                // 2. Parse the combined CSV
                const text = await importFile.text();
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row."); return; }
                
                // Parse header
                const headerParts = lines[0].match(/"([^"]*)"|([^,]+)/g) || [];
                const headers = headerParts.map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
                
                const lvlNumCol = headers.indexOf('level_number');
                const lvlTitleCol = headers.indexOf('level_title');
                const typeCol = headers.indexOf('type');
                const frontCol = headers.indexOf('front');
                const backCol = headers.indexOf('back');
                const qCol = headers.indexOf('question');
                const optACol = headers.indexOf('option_a');
                const optBCol = headers.indexOf('option_b');
                const optCCol = headers.indexOf('option_c');
                const optDCol = headers.indexOf('option_d');
                const optECol = headers.indexOf('option_e');
                const correctCol = headers.indexOf('correct_option');
                const explCol = headers.indexOf('explanation');
                
                if (lvlNumCol === -1) { toast.error("CSV must have a 'level_number' column."); return; }
                if (typeCol === -1) { toast.error("CSV must have a 'type' column (card or question)."); return; }
                
                // Parse all rows
                const parsedRows: any[] = [];
                for (let i = 1; i < lines.length; i++) {
                  const parts = lines[i].match(/"([^"]*)"|([^,]+)/g) || [];
                  parsedRows.push(parts.map(p => p.replace(/^"|"$/g, '').trim()));
                }
                
                // Group by type and level_number
                const levelNames = new Map<number, string>(); // level_number -> level_title
                const cardsByLevel = new Map<number, { front: string; back: string }[]>();
                const questionsByLevel = new Map<number, string[][]>();
                
                for (const row of parsedRows) {
                  const lvlNum = parseInt(row[lvlNumCol]);
                  if (isNaN(lvlNum)) continue;
                  
                  const rowType = (row[typeCol] || '').toLowerCase().trim();
                  
                  // Store level title
                  if (lvlTitleCol >= 0 && row[lvlTitleCol]) {
                    if (!levelNames.has(lvlNum)) levelNames.set(lvlNum, row[lvlTitleCol]);
                  }
                  
                  if (rowType === 'card') {
                    if (!cardsByLevel.has(lvlNum)) cardsByLevel.set(lvlNum, []);
                    cardsByLevel.get(lvlNum)!.push({
                      front: frontCol >= 0 ? row[frontCol] || '' : '',
                      back: backCol >= 0 ? row[backCol] || '' : '',
                    });
                  } else if (rowType === 'question') {
                    if (!questionsByLevel.has(lvlNum)) questionsByLevel.set(lvlNum, []);
                    questionsByLevel.get(lvlNum)!.push(row);
                  }
                }
                
                // Collect all unique level numbers sorted
                const allLevelNums = Array.from(new Set([
                  ...cardsByLevel.keys(),
                  ...questionsByLevel.keys(),
                ])).sort((a, b) => a - b);
                
                if (allLevelNums.length === 0) { toast.error("No valid data found in CSV."); return; }
                
                // 3. Create levels and import content
                let totalLevels = 0;
                let totalCards = 0;
                let totalQuestions = 0;
                const levelMap = new Map<number, number>(); // level_number -> level_id
                
                for (let idx = 0; idx < allLevelNums.length; idx++) {
                  const lvlNum = allLevelNums[idx];
                  const levelTitle = levelNames.get(lvlNum) || `Level ${lvlNum}`;
                  
                  // Create the level
                  const { data: level, error: lError } = await supabase
                    .from("material_levels")
                    .insert({
                      material_id: material.id,
                      title: levelTitle,
                      description: '',
                      level_number: idx + 1, // Sequential even if CSV numbers are non-sequential
                    })
                    .select()
                    .single();
                  if (lError) throw lError;
                  totalLevels++;
                  levelMap.set(lvlNum, level.id);
                  
                  // Import cards for this level
                  const levelCards = cardsByLevel.get(lvlNum) || [];
                  if (levelCards.length > 0) {
                    const cardRows = levelCards
                      .filter(c => c.front)
                      .map((c, ci) => ({
                        level_id: level.id,
                        front: c.front,
                        back: c.back,
                        card_number: ci + 1,
                      }));
                    if (cardRows.length > 0) {
                      const { error: cError } = await supabase.from("material_cards").insert(cardRows);
                      if (cError) throw cError;
                      totalCards += cardRows.length;
                    }
                  }
                  
                  // Import questions for this level
                  const levelQuestions = questionsByLevel.get(lvlNum) || [];
                  if (levelQuestions.length > 0) {
                    const subjectName = getSubjectName(importSubject) || 'General';
                    for (const q of levelQuestions) {
                      if (qCol < 0 || !q[qCol]) continue;
                      
                      const questionRecord: Record<string, any> = {
                        level: 'ss3',
                        subject_id: importSubject,
                        category: subjectName,
                        year: new Date().getFullYear(),
                        question: q[qCol] || '',
                        option_a: optACol >= 0 ? q[optACol] || '' : '',
                        option_b: optBCol >= 0 ? q[optBCol] || '' : '',
                        option_c: optCCol >= 0 ? q[optCCol] || '' : '',
                        option_d: optDCol >= 0 ? q[optDCol] || '' : '',
                        option_e: optECol >= 0 ? q[optECol] || '' : '',
                        correct_option: correctCol >= 0 ? q[correctCol] || 'a' : 'a',
                        explanation: explCol >= 0 ? q[explCol] || '' : '',
                        passage: '',
                      };
                      
                      const { data: inserted, error: insError } = await supabase
                        .from("questions")
                        .insert(questionRecord)
                        .select()
                        .single();
                      if (insError) throw insError;
                      
                      // Link to level
                      const { error: linkError } = await supabase
                        .from("material_level_questions")
                        .insert({ level_id: level.id, question_id: inserted.id });
                      if (linkError) throw linkError;
                      totalQuestions++;
                    }
                  }
                }
                
                const msg = `Material "${title}" created with ${totalLevels} levels, ${totalCards} cards${totalQuestions > 0 ? `, and ${totalQuestions} questions linked` : ''}!`;
                toast.success(msg);
                setShowImportForm(false);
                setImportFile(null);
                setImportTitle("");
                setImportDescription("");
                setImportSubject(null);
                if (importFileRef.current) importFileRef.current.value = '';
                loadData();
              } catch (err: any) {
                toast.error(err?.message || "Import failed.");
              } finally {
                setImporting(false);
              }
            }}
              disabled={importing}
              className="px-6 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-400 transition flex items-center gap-2 disabled:opacity-50"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {importing ? 'Importing...' : 'Import CSV'}
            </button>
            <button onClick={() => { setShowImportForm(false); setImportFile(null); setImportTitle(""); setImportDescription(""); }}
              className="px-6 py-3 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* ─── MATERIAL FORM ─── */}
      {showMaterialForm && (
        <div className="card space-y-4">
          <h3 className="text-lg font-heading font-bold text-policeGold">
            {editingId ? "Edit Material" : "New Study Material"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Subject</label>
              <select value={matSubject ?? ""} onChange={(e) => setMatSubject(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition">
                <option value="">Select Subject</option>
                {uniqueSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Title</label>
              <input type="text" value={matTitle} onChange={(e) => setMatTitle(e.target.value)}
                placeholder="e.g. Newton's Laws of Motion"
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Description (optional)</label>
              <textarea value={matDescription} onChange={(e) => setMatDescription(e.target.value)}
                placeholder="Brief description of this study material..."
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition min-h-[60px]" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveMaterial} className="px-6 py-3 rounded-xl bg-policeGreen/20 text-policeGreen font-bold hover:bg-policeGreen hover:text-white transition flex items-center gap-2">
              <Save size={16} /> {editingId ? "Update" : "Save"}
            </button>
            <button onClick={resetMaterialForm} className="px-6 py-3 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* ─── MATERIALS LIST ─── */}
      <div className="grid gap-4">
        {filteredMaterials.map((mat) => {
          const matLevels = levels.filter((l) => l.material_id === mat.id);
          const matCards = cards.filter((c) => matLevels.some((l) => l.id === c.level_id));
          return (
            <div key={mat.id} className={`rounded-2xl border transition ${
              selectedMaterial === mat.id ? "border-policeGold/40 bg-policeGold/5" : "border-white/10 bg-white/5 hover:border-white/20"
            }`}>
              <div className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setSelectedMaterial(selectedMaterial === mat.id ? null : mat.id)}>
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className="text-policeGold" />
                  <div>
                    <h4 className="font-semibold text-white">{mat.title}</h4>
                    <p className="text-xs text-white/50">{getSubjectName(mat.subject_id)} • {matLevels.length} levels • {matCards.length} cards</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleEditMaterial(mat); }}
                    className="p-2 bg-white/10 rounded-lg text-white/60 hover:text-policeGold hover:bg-policeGold/20 transition">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(mat.id); }}
                    className="p-2 bg-white/10 rounded-lg text-white/60 hover:text-policeRed hover:bg-policeRed/20 transition">
                    <Trash2 size={14} />
                  </button>
                  {selectedMaterial === mat.id ? <ChevronUp size={18} className="text-white/40" /> : <ChevronDown size={18} className="text-white/40" />}
                </div>
              </div>

              {/* ─── LEVELS (expanded) ─── */}
              {selectedMaterial === mat.id && (
                <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Layers size={16} className="text-policeGold" />
                      Levels
                    </div>
                    <div className="flex gap-2">
                      <button onClick={downloadCardTemplate}
                        className="p-2 bg-white/10 rounded-lg text-white/50 hover:text-white hover:bg-white/20 transition" title="Download card template CSV">
                        <Download size={14} />
                      </button>
                      <button onClick={() => { resetLevelForm(); setShowLevelForm(!showLevelForm); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-policeGold/20 text-policeGold text-xs font-semibold hover:bg-policeGold/30 transition">
                        <PlusCircle size={14} /> Add Level
                      </button>
                    </div>
                  </div>

                  {/* ─── MATERIAL-LEVEL CSV IMPORT (always visible) ─── */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-2 border-blue-400/40 rounded-xl p-5">
                    <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
                      <div className="flex items-center gap-3">
                        <Upload size={28} className="text-blue-400 shrink-0" />
                        <div>
                          <p className="text-base font-bold text-white">Import Cards from CSV</p>
                          <p className="text-xs text-white/60 mt-1">Upload a CSV with <strong>front</strong> and <strong>back</strong> columns. The system will auto-create a new level with all the cards.</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-bold cursor-pointer hover:bg-blue-400 transition shadow-lg">
                          <Upload size={18} /> Choose CSV File
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !selectedMaterial) {
                                toast.error("Please select a material first.");
                                return;
                              }
                              
                              // Auto-create a new level based on the filename
                              const levelName = file.name
                                .replace(/\.csv$/i, '')
                                .replace(/[-_]/g, ' ')
                                .replace(/^import[- ]cards[- ]level[- ]?/i, '')
                                .replace(/^cards[- ]?/i, '')
                                .trim() || 'New Level';
                              
                              try {
                                const supabase = await getSupabase();
                                
                                // Create level
                                const matLevels = levels.filter(l => l.material_id === selectedMaterial);
                                const nextNum = matLevels.length > 0 ? Math.max(...matLevels.map(l => l.level_number)) + 1 : 1;
                                
                                const { data: newLevel, error: lError } = await supabase
                                  .from("material_levels")
                                  .insert({
                                    material_id: selectedMaterial,
                                    title: levelName,
                                    description: `Imported from ${file.name}`,
                                    level_number: nextNum,
                                  })
                                  .select()
                                  .single();
                                
                                if (lError) throw lError;
                                
                                // Now parse and import cards
                                const text = await file.text();
                                const lines = text.split('\n').filter(l => l.trim());
                                if (lines.length < 2) {
                                  toast.error("CSV must have a header row and at least one card.");
                                  return;
                                }
                                
                                const cardsToInsert: { front: string; back: string }[] = [];
                                for (let i = 1; i < lines.length; i++) {
                                  // Handle quoted CSV fields properly
                                  const parts = lines[i].match(/"([^"]*)"|([^,]+)/g) || [];
                                  const clean = parts.map(p => p.replace(/^"|"$/g, '').trim());
                                  if (clean.length >= 2) {
                                    cardsToInsert.push({ front: clean[0], back: clean.slice(1).join(', ') });
                                  }
                                }
                                
                                if (cardsToInsert.length === 0) {
                                  toast.error("No valid cards found in CSV.");
                                  return;
                                }
                                
                                const rows = cardsToInsert.map((c, idx) => ({
                                  level_id: newLevel.id,
                                  front: c.front,
                                  back: c.back,
                                  card_number: idx + 1,
                                }));
                                
                                const { error: cError } = await supabase.from("material_cards").insert(rows);
                                if (cError) throw cError;
                                
                                toast.success(`Level "${levelName}" created with ${rows.length} cards!`);
                                loadData();
                              } catch (err: any) {
                                toast.error(err?.message || "Import failed.");
                              }
                              
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-blue-300/70 mt-3 text-center">
                      💡 Select a CSV file and the system will auto-create a level named after the file!
                    </p>
                  </div>

                  {/* Level form */}
                  {showLevelForm && (
                    <div className="bg-black/30 rounded-xl p-4 space-y-3 border border-white/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" value={lvlTitle} onChange={(e) => setLvlTitle(e.target.value)}
                          placeholder="Level title (e.g. Introduction)"
                          className="bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
                        <input type="text" value={lvlDescription} onChange={(e) => setLvlDescription(e.target.value)}
                          placeholder="Description (optional)"
                          className="bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveLevel} className="px-4 py-2 rounded-lg bg-policeGreen/20 text-policeGreen text-xs font-semibold hover:bg-policeGreen/30 transition flex items-center gap-1">
                          <Check size={14} /> {editingId ? "Update" : "Add"}
                        </button>
                        <button onClick={resetLevelForm} className="px-4 py-2 rounded-lg bg-white/10 text-white/50 text-xs hover:bg-white/20 transition">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Level cards */}
                  {filteredLevels.length === 0 && !showLevelForm && (
                    <p className="text-center text-white/40 text-sm py-4">No levels yet. Add one to start building content.</p>
                  )}

                  {filteredLevels.map((lvl) => {
                    const lvlCards = cards.filter((c) => c.level_id === lvl.id);
                    const isExpanded = selectedLevel === lvl.id;
                    return (
                      <div key={lvl.id} className="space-y-2">
                        <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setSelectedLevel(isExpanded ? null : lvl.id)}>
                            <span className="w-7 h-7 rounded-lg bg-policeGold/20 flex items-center justify-center text-policeGold text-xs font-bold">{lvl.level_number}</span>
                            <div>
                              <p className="text-sm font-semibold text-white">{lvl.title}</p>
                              <p className="text-xs text-white/40">{lvlCards.length} cards</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { handleEditLevel(lvl); setShowLevelForm(true); }}
                              className="p-1.5 bg-white/10 rounded-lg text-white/50 hover:text-policeGold transition">
                              <Edit3 size={12} />
                            </button>
                            <button onClick={() => handleDeleteLevel(lvl.id)}
                              className="p-1.5 bg-white/10 rounded-lg text-white/50 hover:text-policeRed transition">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Cards in level (expanded) */}
                        {isExpanded && (
                          <div className="ml-6 space-y-2 pl-4 border-l-2 border-policeGold/20">
                            <div className="flex items-center justify-between bg-black/20 rounded-xl px-3 py-2 border border-white/5">
                              <span className="text-xs text-white/50 uppercase tracking-widest font-semibold">
                                Keypoint Cards 
                                <span className="text-policeGold ml-1">({lvlCards.length})</span>
                              </span>
                              <div className="flex gap-2">
                                <button onClick={() => { resetCardForm(); setShowCardForm(!showCardForm); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-policeGold/20 text-policeGold text-xs font-semibold hover:bg-policeGold/30 border border-policeGold/30 transition">
                                  <PlusCircle size={14} /> Add Card
                                </button>
                              </div>
                            </div>

                            {/* Card form */}
                            {showCardForm && (
                              <div className="bg-black/30 rounded-xl p-4 space-y-3 border border-white/10">
                                <textarea value={cardFront} onChange={(e) => setCardFront(e.target.value)}
                                  placeholder="Front: Key point / concept (required)"
                                  className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-2.5 text-white text-sm outline-none min-h-[60px]" />
                                <textarea value={cardBack} onChange={(e) => setCardBack(e.target.value)}
                                  placeholder="Back: Explanation / details"
                                  className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-2.5 text-white text-sm outline-none min-h-[60px]" />
                                <div className="flex gap-2">
                                  <button onClick={handleSaveCard} className="px-4 py-2 rounded-lg bg-policeGreen/20 text-policeGreen text-xs font-semibold hover:bg-policeGreen/30 transition flex items-center gap-1">
                                    <Check size={14} /> {editingId ? "Update" : "Add"}
                                  </button>
                                  <button onClick={resetCardForm} className="px-4 py-2 rounded-lg bg-white/10 text-white/50 text-xs hover:bg-white/20 transition">Cancel</button>
                                </div>
                              </div>
                            )}

                            {/* Card list */}
                            {lvlCards.length === 0 && !showCardForm && (
                              <p className="text-center text-white/30 text-xs py-4">No cards yet</p>
                            )}
                            {lvlCards.map((card) => (
                              <div key={card.id} className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/10 group">
                                <span className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/50 shrink-0 mt-0.5">{card.card_number}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{card.front}</p>
                                  {card.back && <p className="text-xs text-white/40 mt-1 line-clamp-2">{card.back}</p>}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                  <button onClick={() => handleEditCard(card)}
                                    className="p-1.5 bg-white/10 rounded-lg text-white/50 hover:text-policeGold transition">
                                    <Edit3 size={11} />
                                  </button>
                                  <button onClick={() => handleDeleteCard(card.id)}
                                    className="p-1.5 bg-white/10 rounded-lg text-white/50 hover:text-policeRed transition">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredMaterials.length === 0 && (
          <div className="card text-center py-12">
            <FolderOpen size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No study materials found for this subject.</p>
            <button onClick={() => setShowMaterialForm(true)} className="mt-4 px-5 py-2 rounded-xl bg-policeGold text-policeBlue font-bold text-sm hover:brightness-110 transition">
              Create First Material
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
