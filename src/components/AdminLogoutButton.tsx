"use client";

import { useRouter } from "next/navigation";

export default function AdminLogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
  return <button onClick={handleLogout} className="text-xs text-red-400">Logout</button>;
}