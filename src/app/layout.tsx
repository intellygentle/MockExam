import "@/styles/globals.css";
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Link from "next/link";
import { BookOpen } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Scholars Arena — School Mock Exam",
  description: "Fun mock exam practice for JSS3 and SS3 students. Track your progress, earn badges, and ace your exams!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="bg-gradient-to-b from-policeBlue via-[#030712] to-[#000] min-h-screen text-white font-sans selection:bg-policeGold selection:text-policeBlue">
        <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
        
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-12">
          <header className="pt-8 pb-6 border-b border-white/10 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="bg-policeGold p-2 rounded-xl text-policeBlue">
                  <BookOpen size={28} />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-white/60">Practice Makes Perfect</p>
                  <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-policeGold tracking-wide">Scholars Arena</h1>
                </div>
              </Link>
              <nav className="flex flex-wrap items-center justify-start md:justify-end gap-x-4 sm:gap-x-5 gap-y-2">
                <Link href="/practice" className="text-[11px] sm:text-sm font-semibold uppercase tracking-widest text-white/70 hover:text-policeGold transition">Practice</Link>
                <Link href="/study" className="text-[11px] sm:text-sm font-semibold uppercase tracking-widest text-white/70 hover:text-policeGold transition">Study</Link>
                <Link href="/dashboard" className="text-[11px] sm:text-sm font-semibold uppercase tracking-widest text-white/70 hover:text-policeGold transition">Progress</Link>
                <Link href="/leaderboard" className="text-[11px] sm:text-sm font-semibold uppercase tracking-widest text-white/70 hover:text-policeGold transition">Leaderboard</Link>
              </nav>
            </div>
          </header>
          
          <main className="flex-1 w-full">{children}</main>
          
          <footer className="mt-16 text-center text-xs uppercase tracking-[0.6em] text-white/40">
            Keep learning, stay curious, and have fun! 📚✨
          </footer>
        </div>
      </body>
    </html>
  );
}