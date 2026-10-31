import Link from 'next/link';

export default function GymDashboardPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="rounded-2xl bg-gradient-to-br from-orange-600 to-amber-700 p-8 text-white shadow-xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Gym & Fitness Platform</h1>
        <p className="mt-2 text-orange-100 max-w-xl text-sm sm:text-base">
          Modular member subscriptions, automated WhatsApp fee reminders, QR attendance, and trainer allocations.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-white text-orange-700 font-semibold shadow hover:bg-orange-50 transition">
            Scan Member QR
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-orange-950/60 hover:bg-orange-950 text-white font-medium border border-orange-500/30 transition"
          >
            Switch to RentSutra
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
          <h3 className="font-semibold text-base mb-1 text-orange-400">QR Check-in & Logs</h3>
          <p className="text-sm text-slate-400">Instant check-ins using biometric or mobile camera QR scanners.</p>
        </div>
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
          <h3 className="font-semibold text-base mb-1 text-orange-400">Subscription Plans</h3>
          <p className="text-sm text-slate-400">Monthly, quarterly, and annual gym memberships with auto-reminders.</p>
        </div>
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
          <h3 className="font-semibold text-base mb-1 text-orange-400">Core UPI Gateway</h3>
          <p className="text-sm text-slate-400">Collect fees directly via the shared zero-fee core UPI gateway pipeline.</p>
        </div>
      </div>
    </div>
  );
}

