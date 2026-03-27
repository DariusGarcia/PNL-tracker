"use client";

import { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, googleProvider } from "@/lib/firebase";

type PnlEntry = {
  id: string;
  amount: number;
  date: string;
  note?: string;
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  signDisplay: "always",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function PnlDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<PnlEntry[]>([]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getToday);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    const firebaseDb = getFirebaseDb();
    if (!firebaseDb) {
      setError("Firebase is not configured yet. Add your keys to .env.local.");
      return;
    }

    const pnlQuery = query(
      collection(firebaseDb, "users", user.uid, "pnlEntries"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      pnlQuery,
      (snapshot) => {
        const nextEntries = snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            amount: Number(data.amount ?? 0),
            date: String(data.date ?? entry.id),
            note: data.note ? String(data.note) : "",
          };
        });
        setEntries(nextEntries);
      },
      () => {
        setError("Could not load your P&L history. Check your Firebase setup.");
      }
    );

    return unsubscribe;
  }, [user]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc.net += entry.amount;
        if (entry.amount > 0) acc.profitableDays += 1;
        if (entry.amount < 0) acc.losingDays += 1;
        return acc;
      },
      { net: 0, profitableDays: 0, losingDays: 0 }
    );
  }, [entries]);

  async function handleGoogleSignIn() {
    setError(null);
    try {
      const firebaseAuth = getFirebaseAuth();
      if (!firebaseAuth) {
        setError("Add your Firebase web app keys to .env.local first.");
        return;
      }

      await signInWithPopup(firebaseAuth, googleProvider);
    } catch {
      setError("Google sign-in failed. Make sure the provider is enabled in Firebase.");
    }
  }

  async function handleSaveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const firebaseDb = getFirebaseDb();
    if (!firebaseDb) {
      setError("Firebase is not configured yet. Add your keys to .env.local.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount)) {
      setError("Enter a valid profit or loss amount.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await setDoc(doc(firebaseDb, "users", user.uid, "pnlEntries", date), {
        amount: parsedAmount,
        date,
        note: note.trim(),
        updatedAt: serverTimestamp(),
      });

      setAmount("");
      setNote("");
      setDate(getToday());
    } catch {
      setError("Could not save your P&L entry. Check your Firestore rules and config.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur md:p-10">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(61,213,152,0.08),transparent_35%,rgba(255,107,107,0.08))]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.35em] text-accent/80">
              Stock journal
            </p>
            <h1 className="mt-3 font-sans text-4xl font-semibold tracking-tight sm:text-5xl">
              Daily profit and loss, one clean dashboard.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
              Sign in with Google, record your result for the day, and keep an
              at-a-glance history of your trading performance.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
            {authLoading ? (
              <p className="text-sm text-white/70">Checking your session...</p>
            ) : user ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-white/60">Signed in as</p>
                  <p className="font-medium">{user.displayName ?? user.email}</p>
                </div>
                <button
                  onClick={() => {
                    const firebaseAuth = getFirebaseAuth();
                    if (firebaseAuth) {
                      void signOut(firebaseAuth);
                    }
                  }}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
              >
                Continue with Google
              </button>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Net P&L"
          value={moneyFormatter.format(totals.net)}
          tone={totals.net >= 0 ? "profit" : "loss"}
        />
        <SummaryCard label="Winning days" value={String(totals.profitableDays)} />
        <SummaryCard label="Losing days" value={String(totals.losingDays)} />
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[360px,1fr]">
        <div className="rounded-[28px] border border-white/10 bg-panel/80 p-6">
          <h2 className="text-xl font-semibold">Log today&apos;s result</h2>
          <p className="mt-2 text-sm text-white/60">
            Save one entry per day. Updating the same date will replace that
            day&apos;s value.
          </p>

          <form onSubmit={handleSaveEntry} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Date</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={!user}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">
                Profit / loss
              </span>
              <input
                type="number"
                step="0.01"
                placeholder="Example: 240.50 or -75.25"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={!user}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">
                Notes (optional)
              </span>
              <textarea
                rows={3}
                placeholder="What worked or what hurt today?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={!user}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <button
              type="submit"
              disabled={!user || isSaving}
              className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save daily P&L"}
            </button>
          </form>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Daily history</h2>
              <p className="text-sm text-white/60">
                Your most recent entries appear first.
              </p>
            </div>
          </div>

          {!user ? (
            <EmptyState message="Sign in with Google to start tracking your daily results." />
          ) : entries.length === 0 ? (
            <EmptyState message="No entries yet. Add your first trading day to start building the timeline." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {entries.map((entry) => {
                const isProfit = entry.amount >= 0;

                return (
                  <article
                    key={entry.id}
                    className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-glow"
                  >
                    <p className="text-sm text-white/50">
                      {dateFormatter.format(new Date(`${entry.date}T00:00:00`))}
                    </p>
                    <p
                      className={`mt-4 text-3xl font-semibold ${
                        isProfit ? "text-profit" : "text-loss"
                      }`}
                    >
                      {moneyFormatter.format(entry.amount)}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.28em] text-white/45">
                      {isProfit ? "Profit day" : "Loss day"}
                    </p>
                    {entry.note ? (
                      <p className="mt-4 text-sm leading-6 text-white/70">
                        {entry.note}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
}) {
  const toneClass =
    tone === "profit"
      ? "text-profit"
      : tone === "loss"
        ? "text-loss"
        : "text-white";

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-white/55">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center text-sm text-white/60">
      {message}
    </div>
  );
}
