export default function GymLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="gym-module-container min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
            Pulse Gym & Fitness
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-950 text-orange-300 border border-orange-800">
            Fitness Engine
          </span>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

