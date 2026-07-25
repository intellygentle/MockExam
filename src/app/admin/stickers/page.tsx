"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type Sticker = {
  id: number;
  url: string;
  active: boolean;
  created_at: string;
};

/**
 * Admin Stickers Manager
 * - Upload WhatsApp stickers (PNG/WEBP)
 * - View all stickers
 * - Toggle active/inactive status
 */
export default function AdminStickersPage() {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadStickers();
  }, []);

  const loadStickers = async () => {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("stickers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStickers(data || []);
    } catch (error) {
      setStatus("⚠️ Error loading stickers");
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus("📤 Uploading sticker...");

    try {
      const fileName = `${Date.now()}-${file.name}`;
      
      const supabase = await getSupabase();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("stickers")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("stickers")
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from("stickers")
        .insert({ url: publicUrl, active: true });

      if (dbError) throw dbError;

      setStatus("✅ Sticker uploaded successfully!");
      loadStickers();
      setTimeout(() => setStatus(""), 3000);
    } catch (error) {
      setStatus("❌ Upload failed. Check console.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase
        .from("stickers")
        .update({ active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      loadStickers();
    } catch (error) {
      setStatus("❌ Error updating sticker");
    }
  };

  const deleteSticker = async (id: number, url: string) => {
    if (!confirm("Delete this sticker?")) return;

    try {
      // Extract file path from URL
      const fileName = url.split("/").pop();
      
      const supabase = await getSupabase();

      // Delete from storage
      if (fileName) {
        await supabase.storage.from("stickers").remove([fileName]);
      }

      // Delete from database
      const { error } = await supabase.from("stickers").delete().eq("id", id);
      if (error) throw error;

      setStatus("✅ Sticker deleted!");
      loadStickers();
      setTimeout(() => setStatus(""), 2000);
    } catch (error) {
      setStatus("❌ Error deleting sticker");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-heading font-bold text-policeGold">WhatsApp Stickers</h2>
        <p className="text-sm text-white/60">Upload funny stickers to show when recruits get answers wrong</p>
      </div>

      {/* Status */}
      {status && (
        <div className="card bg-white/10 border-policeGold">
          <p className="text-center font-semibold">{status}</p>
        </div>
      )}

      {/* Upload Section */}
      <div className="card space-y-4">
        <h3 className="text-lg font-heading font-bold">Upload New Sticker</h3>
        <div>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-policeGold transition">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <p className="mb-2 text-sm text-white/60">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-white/40">PNG, WEBP (512x512 recommended)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/png,image/webp"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Stickers Grid */}
      <div>
        <h3 className="text-lg font-heading font-bold text-policeGold mb-4">
          All Stickers ({stickers.length})
        </h3>
        
        {stickers.length === 0 ? (
          <div className="card text-center">
            <p className="text-white/60">No stickers yet. Upload your first one above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stickers.map((sticker) => (
              <div key={sticker.id} className="card space-y-3">
                <div className="aspect-square bg-white/5 rounded-xl flex items-center justify-center overflow-hidden">
                  <img
                    src={sticker.url}
                    alt="Sticker"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="space-y-2">
                  <button
                    onClick={() => toggleActive(sticker.id, sticker.active)}
                    className={`w-full py-2 rounded-lg text-xs font-semibold transition ${
                      sticker.active
                        ? "bg-policeGreen/20 text-policeGreen border border-policeGreen"
                        : "bg-white/5 text-white/40 border border-white/10"
                    }`}
                  >
                    {sticker.active ? "✅ Active" : "⏸ Inactive"}
                  </button>
                  
                  <button
                    onClick={() => deleteSticker(sticker.id, sticker.url)}
                    className="w-full py-2 rounded-lg text-xs font-semibold bg-policeRed/20 text-policeRed border border-policeRed hover:brightness-110"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
