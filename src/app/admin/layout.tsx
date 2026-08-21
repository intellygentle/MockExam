import Link from "next/link";
import { cookies } from "next/headers";
import { getAdminCookieName, verifyAdminSessionToken } from "@/lib/admin-session";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import AdminLoginForm from "@/components/AdminLoginForm";

const secretPath = process.env.SECRET_ADMIN_PATH || "word";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  const isAuthenticated = verifyAdminSessionToken(token);

  // Not logged in → show login form
  if (!isAuthenticated) {
    return <AdminLoginForm />;
  }

  // Logged in → show full admin interface
  return (
    <div className="min-h-screen bg-[#030712]">
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-heading font-bold text-policeGold">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm text-white/70 hover:text-policeGold">← Home</Link>
              <AdminLogoutButton />
            </div>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2 sm:gap-4">
            <Link
              href={`/${secretPath}`}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5 transition"
            >
              Questions
            </Link>
            <Link
              href={`/${secretPath}/departments`}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5 transition"
            >
              Departments
            </Link>
            <Link
              href={`/${secretPath}/subjects`}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5 transition"
            >
              Subjects
            </Link>
            <Link
              href={`/${secretPath}/stickers`}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5 transition"
            >
              Stickers
            </Link>
            <Link
              href={`/${secretPath}/study-materials`}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5 transition"
            >
              Study Materials
            </Link>
            <Link
              href={`/${secretPath}/drills`}
              className="px-4 py-2 rounded-lg border border-orange-500/30 text-sm hover:bg-orange-500/10 transition text-orange-400"
            >
              🔥 Drills
            </Link>
            <Link
              href={`/${secretPath}/drills/analytics`}
              className="px-4 py-2 rounded-lg border border-blue-500/30 text-sm hover:bg-blue-500/10 transition text-blue-400"
            >
              📊 Analytics
            </Link>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  );
}