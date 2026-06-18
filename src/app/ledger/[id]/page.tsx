import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Home, FileText, Calendar, Wallet, Scissors } from "lucide-react";
import Link from "next/link";
import ClientReceiptActions from "./ClientReceiptActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LedgerReceiptPage({ params }: PageProps) {
  const { id } = await params;
  const headerList = await headers();
  const subdomain = headerList.get("x-pg-subdomain");

  const db = await getAdminDb();
  let ownerId: string | null = null;
  let matchedGuest: any = null;
  let matchedEntry: any = null;
  let matchedPg: any = null;

  // 1. Try subdomain lookup first
  if (subdomain) {
    const pgsSnap = await db
      .collectionGroup("pgs")
      .where("subdomain", "==", subdomain)
      .limit(1)
      .get();
    if (!pgsSnap.empty) {
      const pgData = pgsSnap.docs[0].data();
      ownerId = pgData.ownerId || pgsSnap.docs[0].ref.parent.parent?.id || null;
      matchedPg = pgData;
    }
  }

  if (ownerId) {
    const guestsSnap = await db
      .collection("users_data")
      .doc(ownerId)
      .collection("guests")
      .get();
    for (const doc of guestsSnap.docs) {
      const guest = doc.data();
      const entry = (guest.ledger || []).find((e: any) => e.id === id);
      if (entry) {
        matchedGuest = guest;
        matchedEntry = entry;
        break;
      }
    }
  }

  // 2. Fallback: Lookup globally across all guests
  if (!matchedEntry) {
    const guestsSnap = await db.collectionGroup("guests").get();
    for (const doc of guestsSnap.docs) {
      const guest = doc.data();
      const entry = (guest.ledger || []).find((e: any) => e.id === id);
      if (entry) {
        matchedGuest = guest;
        matchedEntry = entry;
        ownerId = guest.ownerId || doc.ref.parent.parent?.id || null;
        break;
      }
    }
  }

  if (!matchedEntry || !matchedGuest) {
    notFound();
  }

  // Fetch PG details if not already fetched
  if (ownerId && matchedGuest.pgId && !matchedPg) {
    const pgSnap = await db
      .collection("users_data")
      .doc(ownerId)
      .collection("pgs")
      .doc(matchedGuest.pgId)
      .get();
    if (pgSnap.exists) {
      matchedPg = pgSnap.data();
    }
  }

  const pgName =
    matchedPg?.name || matchedGuest.pgName || "RentSutra Associated PG";
  const amountStr =
    matchedEntry.amountType === "symbolic"
      ? matchedEntry.symbolicValue || "XXX"
      : `₹${matchedEntry.amount.toLocaleString("en-IN")}`;

  const remainingBalance =
    matchedGuest.amountType === "symbolic"
      ? matchedGuest.symbolicBalance || "Settled"
      : `₹${matchedGuest.balance.toLocaleString("en-IN")}`;

  const formattedDate = new Date(matchedEntry.date).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:py-0">
      <div className="max-w-md mx-auto space-y-6">
        {/* Back Link - Hidden during print */}
        <div className="flex justify-between items-center print:hidden px-2">
          <Link
            href="/tenants/my-pg"
            className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Official Receipt
          </span>
        </div>

        {/* Physical Paper Receipt Card */}
        <Card className="bg-[#fdfdfc] dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.06)] print:shadow-none print:border-none rounded-none relative font-mono overflow-hidden">
          {/* Rotated Physical Stamp */}
          <div className="absolute right-6 top-8 border-4 border-emerald-500/80 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/60 uppercase font-black text-xl px-3 py-1 rounded tracking-widest rotate-[-15deg] select-none pointer-events-none opacity-85 z-10">
            PAID
          </div>

          {/* Receipt Cut Line/Decorative Top */}
          <div className="w-full flex justify-between overflow-hidden opacity-30 select-none print:hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="text-xs font-black select-none">
                -
              </span>
            ))}
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Store / PG Header */}
            <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300 dark:border-slate-800">
              <h2 className="text-lg font-bold uppercase tracking-wide text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                <Home className="w-4 h-4 shrink-0 text-slate-500" />
                {pgName}
              </h2>
              {matchedPg?.location && (
                <p className="text-[11px] text-slate-500 uppercase tracking-tight">
                  {matchedPg.location}, {matchedPg.city}
                </p>
              )}
              {matchedPg?.contact && (
                <p className="text-[10px] text-slate-500">
                  CONTACT: {matchedPg.contact}
                </p>
              )}
            </div>

            {/* Invoice Identifier metadata */}
            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>RECEIPT ID:</span>
                <span className="font-bold">{matchedEntry.id}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE/TIME:</span>
                <span>{formattedDate}</span>
              </div>
            </div>

            {/* Customer Info Section */}
            <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-4 space-y-2 text-xs">
              <span className="block font-bold uppercase text-slate-400 tracking-wider">
                Resident Record
              </span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>NAME:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {matchedGuest.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>PHONE:</span>
                  <span>{matchedGuest.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span>ROOM / BED:</span>
                  <span className="font-bold">
                    ROOM {matchedGuest.roomName || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Item Breakdown */}
            <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-4 space-y-3">
              <span className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                Description
              </span>
              <div className="text-xs space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <span className="font-medium text-slate-700 dark:text-slate-300 uppercase">
                    {matchedEntry.description}
                  </span>
                  <span className="font-bold shrink-0 text-slate-900 dark:text-white">
                    {amountStr}
                  </span>
                </div>
              </div>
            </div>

            {/* Separator Double Line (Classical Register Print) */}
            <div className="w-full text-center border-t-2 border-double border-slate-300 dark:border-slate-800 my-2" />

            {/* Receipt Ledger Summary Total */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider">
                  TOTAL PAID:
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {amountStr}
                </span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>PAYMENT METHOD:</span>
                <span className="uppercase">
                  {matchedEntry.paymentMode || "In-App Payment"}
                </span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500">
                <span>REMAINING BAL:</span>
                <span>{remainingBalance}</span>
              </div>
            </div>

            {/* Footer (Serrated bottom divider) */}
            <div className="text-center text-[10px] text-slate-400 border-t border-dashed border-slate-300 dark:border-slate-800 pt-5 space-y-1 leading-relaxed">
              <p className="font-bold uppercase tracking-wider text-slate-500">
                *** Thank You ***
              </p>
              <p>Powered by Roombox Management Platform</p>
            </div>
          </CardContent>

          {/* Printable Dashed Cutting Guide */}
          <div className="w-full flex justify-between items-center text-slate-400 text-xs px-4 select-none opacity-40 py-2 border-t border-dashed border-slate-200 dark:border-slate-900 print:hidden">
            <Scissors className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-widest mx-2">
              Cut along dotted line
            </span>
            <div className="flex-1 border-t border-dashed border-slate-300 dark:border-slate-800" />
          </div>

          {/* Print Actions Wrapper (Hidden during print) */}
          <ClientReceiptActions
            id={matchedEntry.id}
            pgName={pgName}
            amount={amountStr}
          />
        </Card>

        <p className="text-center text-[10px] text-slate-400 print:hidden font-mono uppercase tracking-wider">
          Official Digital Ledger Entry
        </p>
      </div>
    </div>
  );
}
