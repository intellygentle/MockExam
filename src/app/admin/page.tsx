"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { PlusCircle, Trash2, Database } from "lucide-react";

// (Keep existing Type Definitions)
type Question = {
  id?: number; category: string; question: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_option: "a" | "b" | "c" | "d"; explanation: string;
};
const categories = ["English", "General Knowledge", "Current Affairs", "Constitution", "Ethics"];

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState<Question>({
    category: "English", question: "", option_a: "", option_b: "",
    option_c: "", option_d: "", correct_option: "a", explanation: "",
  });

  useEffect(() => { loadQuestions(); }, []);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase.from("questions").select("*").order("id", { ascending: false });
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      toast.error("Failed to load database. Check Supabase connection.");
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("Saving entry to database...");
    try {
      const { error } = await supabase.from("questions").insert([formData]);
      if (error) throw error;

      toast.success("Question locked in successfully!", { id: loadingToast });
      setFormData({ category: "English", question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", explanation: "" });
      setShowForm(false);
      loadQuestions();
    } catch (error) {
      toast.error("Upload failed.", { id: loadingToast });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Erase this record completely?")) return;
    try {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Record expunged.");
      loadQuestions();
    } catch (error) { toast.error("Erase failed."); }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-6 rounded-3xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-policeGold/20 p-3 rounded-full text-policeGold"><Database size={28} /></div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-white">Questions Database</h2>
            <p className="text-sm text-white/50">{questions.length} Active Records</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition ${
            showForm ? "bg-white/10 text-white" : "bg-policeGold text-policeBlue hover:scale-105"
          }`}
        >
          {showForm ? "Cancel Entry" : <><PlusCircle size={20} /> Add Record</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-5 animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-xl font-heading font-bold text-policeGold pb-2 border-b border-white/10">New Intelligence Record</h3>
          {/* Form fields remain mostly the same, just better focus styling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" required>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">The Question</label>
              <textarea value={formData.question} onChange={(e) => setFormData({ ...formData, question: e.target.value })} className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition min-h-[100px]" required placeholder="Enter the scenario or fact..." />
            </div>

            {(["a", "b", "c", "d"] as const).map((option) => (
              <div key={option}>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Option {option}</label>
                <input type="text" value={formData[`option_${option}`]} onChange={(e) => setFormData({ ...formData, [`option_${option}`]: e.target.value })} className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" required />
              </div>
            ))}

            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Correct Target</label>
              <select value={formData.correct_option} onChange={(e) => setFormData({ ...formData, correct_option: e.target.value as "a" | "b" | "c" | "d" })} className="w-full bg-black/40 border border-white/10 focus:border-policeGreen rounded-xl px-4 py-3 text-white outline-none transition" required>
                {["a", "b", "c", "d"].map(opt => <option key={opt} value={opt}>Option {opt.toUpperCase()}</option>)}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Debriefing (Explanation)</label>
              <textarea value={formData.explanation} onChange={(e) => setFormData({ ...formData, explanation: e.target.value })} className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition min-h-[80px]" required />
            </div>
          </div>
          <button type="submit" className="w-full py-4 mt-4 rounded-xl bg-policeGold text-policeBlue font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition">Commit Record</button>
        </form>
      )}

      <div className="grid gap-4">
        {loading ? (
           <p className="text-center text-white/50 py-10">Accessing archives...</p>
        ) : questions.map((q) => (
          <div key={q.id} className="bg-white/5 border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row gap-6 justify-between items-start">
            <div className="space-y-3 flex-1">
              <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-policeGold bg-policeGold/10 px-2 py-1 rounded">{q.category}</span>
              <h4 className="text-lg font-semibold text-white leading-snug">{q.question}</h4>
              <p className="text-sm text-white/50 bg-black/30 p-3 rounded-lg border border-white/5">💡 {q.explanation}</p>
            </div>
            <button onClick={() => q.id && handleDelete(q.id)} className="shrink-0 p-3 bg-policeRed/10 text-policeRed rounded-xl hover:bg-policeRed hover:text-white transition group">
              <Trash2 size={20} className="group-hover:scale-110 transition-transform"/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}