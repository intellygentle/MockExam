import { Trophy, Medal, Award } from "lucide-react";

const leaderboard = [
  { name: "Aminat", points: 480 },
  { name: "Chike", points: 450 },
  { name: "Sade", points: 430 },
  { name: "Emeka", points: 410 },
  { name: "Bolanle", points: 390 },
];

function getRankIcon(rank: number) {
  switch(rank) {
    case 1: return <Trophy className="text-yellow-400" size={24} />;
    case 2: return <Medal className="text-gray-300" size={24} />;
    case 3: return <Medal className="text-amber-600" size={24} />;
    default: return <Award className="text-white/20" size={20} />;
  }
}

type RowProps = { rank: number; name: string; points: number };

function Row({ rank, name, points }: RowProps) {
  const isTop3 = rank <= 3;
  return (
    <div className={`flex items-center justify-between rounded-2xl border px-6 py-4 transition-transform hover:scale-[1.02]
      ${rank === 1 ? "bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]" : "bg-white/5 border-white/10"}
    `}>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="w-10 text-center flex justify-center">{getRankIcon(rank)}</div>
        <div>
          <p className={`font-bold text-lg ${isTop3 ? "text-white" : "text-white/80"}`}>{name}</p>
          <p className="text-[10px] uppercase tracking-widest text-white/40">Recruit Class '25</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-mono font-bold text-xl ${rank === 1 ? "text-yellow-400" : "text-policeGreen"}`}>
          {points}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-white/40">PTS</p>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <div className="space-y-10 px-4 pb-12">
      <header className="mx-auto max-w-2xl text-center space-y-4">
        <div className="inline-flex justify-center p-4 bg-white/5 rounded-full mb-2">
          <Trophy size={40} className="text-policeGold" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white tracking-tight">Wall of Honor</h1>
        <p className="text-white/60 text-lg">Daily standouts leading the charge. Keep practicing to secure your spot.</p>
      </header>
      
      <section className="mx-auto max-w-2xl space-y-3">
        {leaderboard.map((item, index) => (
          <Row key={item.name} rank={index + 1} name={item.name} points={item.points} />
        ))}
      </section>
    </div>
  );
}