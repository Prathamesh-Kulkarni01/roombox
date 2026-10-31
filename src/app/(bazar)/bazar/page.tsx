import Link from 'next/link';

export default function BazarHomePage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white shadow-xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Palus Local Bazar</h1>
        <p className="mt-2 text-emerald-100 max-w-xl text-sm sm:text-base">
          Connecting local merchants, farmers, and consumers across Palus on a high-speed, modular local platform.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-white text-emerald-700 font-semibold shadow hover:bg-emerald-50 transition">
            Explore Stores
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-emerald-800/60 hover:bg-emerald-800 text-white font-medium border border-emerald-500/30 transition"
          >
            Go to RentSutra Dashboard
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm">
          <h3 className="font-semibold text-base mb-1">Local Grocery & Veggies</h3>
          <p className="text-sm text-muted-foreground">Fresh daily produce from trusted Palus stores delivered fast.</p>
        </div>
        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm">
          <h3 className="font-semibold text-base mb-1">Local Electronics & Services</h3>
          <p className="text-sm text-muted-foreground">Hardware, repairs, and electrical services right around your block.</p>
        </div>
        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm">
          <h3 className="font-semibold text-base mb-1">Direct Merchant UPI</h3>
          <p className="text-sm text-muted-foreground">0% commission payments directly through instant UPI rails.</p>
        </div>
      </div>
    </div>
  );
}

