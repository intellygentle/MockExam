"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { PlusCircle, Trash2, Edit3, X, Check, Layers } from "lucide-react";

type Department = {
  id: number;
  name: string;
  level: string;
  created_at: string;
};

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");

  useEffect(() => { loadDepartments(); }, []);

  const loadDepartments = async () => {
    try {
      const supabase = await getSupabase();
      const { data } = await supabase.from("departments").select("*").order("name");
      setDepartments(data || []);
    } catch { toast.error("Failed to load departments."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const supabase = await getSupabase();

    try {
      if (editingId) {
        const { error } = await supabase.from("departments").update({ name: formName.trim() }).eq("id", editingId);
        if (error) throw error;
        toast.success("Department updated!");
      } else {
        const { error } = await supabase.from("departments").insert({ name: formName.trim(), level: "ss3" });
        if (error) throw error;
        toast.success("Department added!");
      }
      setFormName("");
      setShowForm(false);
      setEditingId(null);
      loadDepartments();
    } catch { toast.error("Save failed."); }
  };

  const handleEdit = (dept: Department) => {
    setFormName(dept.name);
    setEditingId(dept.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this department? All subjects under it will lose their department link.")) return;
    try {
      const supabase = await getSupabase();
      await supabase.from("departments").delete().eq("id", id);
      toast.success("Department deleted.");
      loadDepartments();
    } catch { toast.error("Delete failed."); }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName("");
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/10">
        <div className="flex items-center gap-4">
          <div className="bg-policeGold/20 p-3 rounded-full text-policeGold"><Layers size={28} /></div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-white">Departments</h2>
            <p className="text-sm text-white/50">For SS3 — Science, Arts, Commercial</p>
          </div>
        </div>
        <button onClick={() => { cancelForm(); setShowForm(true); }} className="px-6 py-3 rounded-xl flex items-center gap-2 font-bold bg-policeGold text-policeBlue hover:scale-105 transition">
          <PlusCircle size={20} /> Add Department
        </button>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h3 className="text-lg font-heading font-bold text-policeGold">{editingId ? "Edit Department" : "New Department"}</h3>
          <div className="flex gap-3">
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="Department name (e.g. Science)"
              className="flex-1 bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition"
              autoFocus
            />
            <button onClick={handleSave} className="p-3 bg-policeGreen/20 text-policeGreen rounded-xl hover:bg-policeGreen hover:text-white transition">
              <Check size={20} />
            </button>
            <button onClick={cancelForm} className="p-3 bg-white/10 text-white/60 rounded-xl hover:bg-white/20 transition">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          <p className="text-center text-white/50 py-10">Loading departments...</p>
        ) : departments.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-white/60">No departments yet. SS3 subjects are grouped into departments.</p>
          </div>
        ) : departments.map((dept) => (
          <div key={dept.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-white/20 transition">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-policeGold/20 flex items-center justify-center text-policeGold font-bold">
                {dept.name[0]}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">{dept.name}</h4>
                <p className="text-xs uppercase tracking-widest text-white/40">SS3</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(dept)} className="p-2 bg-white/10 text-white/60 rounded-lg hover:bg-policeGold/20 hover:text-policeGold transition">
                <Edit3 size={16} />
              </button>
              <button onClick={() => handleDelete(dept.id)} className="p-2 bg-white/10 text-white/60 rounded-lg hover:bg-policeRed/20 hover:text-policeRed transition">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
