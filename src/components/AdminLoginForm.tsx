"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secretKey }),
    });

    if (res.ok) {
      router.refresh();           // Important: refresh so layout sees the cookie
    } else {
      setError("Invalid access key");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030712]">
      <form onSubmit={handleLogin} className="card w-full max-w-sm space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-policeGold">Admin Access</h2>
          <p className="text-white/60 text-sm mt-2">Enter secret key</p>
        </div>

        <input
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:border-policeGold outline-none"
          placeholder="Secret Key"
          disabled={loading}
        />

        {error && <p className="text-red-400 text-center text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-policeGold text-policeBlue font-bold py-3 rounded-xl hover:brightness-110 transition disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Unlock Admin"}
        </button>
      </form>
    </div>
  );
}