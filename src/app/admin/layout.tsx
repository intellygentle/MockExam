import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-heading font-bold text-policeGold">Admin Dashboard</h1>
              <p className="text-xs text-white/60">Manage questions and stickers</p>
            </div>
            <Link href="/" className="text-sm text-white/70 hover:text-policeGold transition">
              ← Back to Home
            </Link>
          </div>
          
          <nav className="mt-4 flex gap-4">
            <Link 
              href="/admin" 
              className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5 transition"
            >
              Questions
            </Link>
            <Link 
              href="/admin/stickers" 
              className="px-4 py-2 rounded-lg border border-white/10 text-sm hover:bg-white/5 transition"
            >
              Stickers
            </Link>
          </nav>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
