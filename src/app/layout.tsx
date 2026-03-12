import "@/styles/globals.css";
import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Recruit — Nigeria Police Mock Exam",
  description: "Gamified mock questions, funny stickers, and badges for Nigerian police aspirants.",
  icons: {
    icon: "/image%20(9).jpg",
    shortcut: "/image%20(9).jpg",
    apple: "/image%20(9).jpg",
  },
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
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-white/60">Nigeria Police 2025/2026</p>
                  <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-policeGold tracking-wide">Recruit Arena</h1>
                </div>
              </Link>
              <div className="flex gap-4 items-center">
                <Link href="/practice" className="text-sm font-semibold uppercase tracking-widest text-white/70 hover:text-policeGold transition">Practice</Link>
                <Link href="/leaderboard" className="text-sm font-semibold uppercase tracking-widest text-white/70 hover:text-policeGold transition">Rankings</Link>
                {/* <Link href="/admin" className="text-sm font-semibold uppercase tracking-widest text-white/70 hover:text-policeGold transition">Admin</Link> */}
              </div>
            </div>
          </header>
          
          <main className="flex-1 w-full">{children}</main>
          
          <footer className="mt-16 text-center text-xs uppercase tracking-[0.6em] text-white/40">
            Built with discipline, humour, and confetti 🎉
          </footer>
        </div>
      </body>
    </html>
  );
}