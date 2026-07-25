"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { PlusCircle, Trash2, Edit3, X, Check, BookOpen } from "lucide-react";

type Department = { id: number; name: string; level: string };
type Subject = { id: number; name: string; department_id: number | null; level: string };

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formLevel, setFormLevel] = useState<"jss3" | "ss3">("jss3");
  const [formDept, setFormDept] = useState<number | null>(null);
  const [filterLevel, setFilterLevel] = useState<"all" | "jss3" | "ss3">("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabase = await getSupabase();
      const [subjRes, deptRes] = await Promise.all([
        supabase.from("subjects").select("*").order("name"),
        supabase.from("departments").select("*").order("name"),
      ]);
      setSubjects(subjRes.data || []);
      setDepartments(deptRes.data || []);
    } catch { toast.error("Failed to load data."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const supabase = await getSupabase();

    const payload = {
      name: formName.trim(),
      level: formLevel,
      department_id: formLevel === "ss3" ? formDept : null,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from("subjects").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Subject updated!");
      } else {
        const { error } = await supabase.from("subjects").insert(payload);
        if (error) throw error;
        toast.success("Subject added!");
      }
      resetForm();
      loadData();
    } catch (e: any) { toast.error(e?.message || "Save failed."); }
  };

  const handleEdit = (subj: Subject) => {
    setFormName(subj.name);
    setFormLevel(subj.level as "jss3" | "ss3");
    setFormDept(subj.department_id);
    setEditingId(subj.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this subject? Questions under it will lose their subject link.")) return;
    try {
      const supabase = await getSupabase();
      await supabase.from("subjects").delete().eq("id", id);
      toast.success("Subject deleted.");
      loadData();
    } catch { toast.error("Delete failed."); }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormLevel("jss3");
    setFormDept(null);
  };

  const filtered = filterLevel === "all"
    ? subjects
    : subjects.filter(s => s.level === filterLevel);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-6 rounded-3xl border border-white/10">
        <div className="flex items-center gap-4">
          <div className="bg-policeGold/20 p-3 rounded-full text-policeGold"><BookOpen size={28} /></div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-white">Subjects</h2>
            <p className="text-sm text-white/50">{subjects.length} subjects across all levels</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value as any)}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none cursor-pointer">
            <option value="all">All Levels</option>
            <option value="jss3">JSS3</option>
            <option value="ss3">SS3</option>
          </select>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="px-6 py-3 rounded-xl flex items-center gap-2 font-bold bg-policeGold text-policeBlue hover:scale-105 transition">
            <PlusCircle size={20} /> Add Subject
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h3 className="text-lg font-heading font-bold text-policeGold">
            {editingId ? "Edit Subject" : "New Subject"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Subject Name</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Mathematics"
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Level</label>
              <select value={formLevel} onChange={(e) => {
                setFormLevel(e.target.value as "jss3" | "ss3");
                if (e.target.value === "jss3") setFormDept(null);
              }}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition">
                <option value="jss3">JSS3</option>
                <option value="ss3">SS3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Department (SS3 only)</label>
              <select value={formDept ?? ""} onChange={(e) => setFormDept(e.target.value ? Number(e.target.value) : null)}
                disabled={formLevel === "jss3"}
                className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition disabled:opacity-50">
                <option value="">— None —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="px-6 py-3 rounded-xl flex items-center gap-2 font-bold bg-policeGreen/20 text-policeGreen hover:bg-policeGreen hover:text-white transition">
              <Check size={18} /> {editingId ? "Update" : "Save"}
            </button>
            <button onClick={resetForm} className="px-6 py-3 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {loading ? (
          <p className="text-center text-white/50 py-10">Loading subjects...</p>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-white/60">No subjects found.</p>
          </div>
        ) : filtered.map((subj) => {
          const dept = subj.department_id ? departments.find(d => d.id === subj.department_id) : null;
          return (
            <div key={subj.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:border-white/20 transition">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-policeGold/20 flex items-center justify-center text-policeGold font-bold text-sm">
                  {subj.name[0]}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{subj.name}</h4>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
                    <span className="text-white/40">{subj.level.toUpperCase()}</span>
                    {dept && <><span className="text-white/20">•</span><span className="text-policeGold">{dept.name}</span></>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(subj)} className="p-2 bg-white/10 text-white/60 rounded-lg hover:bg-policeGold/20 hover:text-policeGold transition">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(subj.id)} className="p-2 bg-white/10 text-white/60 rounded-lg hover:bg-policeRed/20 hover:text-policeRed transition">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
