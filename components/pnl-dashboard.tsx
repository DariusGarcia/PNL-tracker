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
  deleteDoc,
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

const monthHeadingFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getWeekStart(date = new Date()) {
  const next = new Date(date);
  const day = next.getDay();
  const distance = day === 0 ? 6 : day - 1;
  next.setDate(next.getDate() - distance);
  return next.toISOString().slice(0, 10);
}

function getMonthLabel(month: string) {
  return monthHeadingFormatter.format(new Date(`${month}-01T00:00:00`));
}

function buildCalendarDays(month: string, entries: PnlEntry[]) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const entryMap = new Map(entries.map((entry) => [entry.date, entry]));
  const cells: Array<{ key: string; dayNumber?: number; entry?: PnlEntry }> = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T00:00:00`).getDay();

    if (weekday === 0 || weekday === 6) {
      continue;
    }

    if (cells.length === 0) {
      const firstOffset = weekday - 1;
      for (let index = 0; index < firstOffset; index += 1) {
        cells.push({ key: `empty-${index}` });
      }
    } else {
      const lastFilledIndex = cells.length % 5;
      if (lastFilledIndex === 0) {
        const offset = weekday - 1;
        for (let index = 0; index < offset; index += 1) {
          cells.push({ key: `empty-${date}-${index}` });
        }
      }
    }

    cells.push({
      key: date,
      dayNumber: day,
      entry: entryMap.get(date),
    });
  }

  return cells;
}

function getAmountTextClass(amount: number, compact = false) {
  const label = moneyFormatter.format(amount);

  if (compact) {
    if (label.length >= 10) return "text-[10px]";
    if (label.length >= 8) return "text-[11px]";
    return "text-xs";
  }

  if (label.length >= 12) return "text-xl";
  if (label.length >= 10) return "text-2xl";
  return "text-3xl";
}

type RangeKey = "weekly" | "monthly" | "ytd" | "total";
type MobileTabKey = "calendar" | "analytics" | "settings";

export function PnlDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<PnlEntry[]>([]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getToday);
  const [note, setNote] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [selectedRange, setSelectedRange] = useState<RangeKey>("total");
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [isMobileAccountMenuOpen, setIsMobileAccountMenuOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTabKey>("calendar");
  const [editingEntry, setEditingEntry] = useState<PnlEntry | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [isUpdatingEntry, setIsUpdatingEntry] = useState(false);
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

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => entry.date.startsWith(selectedMonth));
  }, [entries, selectedMonth]);

  const calendarDays = useMemo(() => {
    return buildCalendarDays(selectedMonth, filteredEntries);
  }, [filteredEntries, selectedMonth]);

  const rangeEntries = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const weekStart = getWeekStart();

    if (selectedRange === "weekly") {
      return entries.filter((entry) => entry.date >= weekStart);
    }

    if (selectedRange === "monthly") {
      return filteredEntries;
    }

    if (selectedRange === "ytd") {
      return entries.filter((entry) => entry.date.startsWith(currentYear));
    }

    return entries;
  }, [entries, filteredEntries, selectedRange]);

  const totals = useMemo(() => {
    return rangeEntries.reduce(
      (acc, entry) => {
        acc.net += entry.amount;
        if (entry.amount > 0) acc.profitableDays += 1;
        if (entry.amount < 0) acc.losingDays += 1;
        return acc;
      },
      { net: 0, profitableDays: 0, losingDays: 0 }
    );
  }, [rangeEntries]);

  const analytics = useMemo(() => {
    const winningEntries = entries.filter((entry) => entry.amount > 0);
    const losingEntries = entries.filter((entry) => entry.amount < 0);
    const totalDays = entries.length;
    const averageDaily =
      totalDays > 0
        ? entries.reduce((sum, entry) => sum + entry.amount, 0) / totalDays
        : 0;
    const bestDay =
      entries.length > 0
        ? entries.reduce((best, entry) =>
            entry.amount > best.amount ? entry : best
          )
        : null;
    const worstDay =
      entries.length > 0
        ? entries.reduce((worst, entry) =>
            entry.amount < worst.amount ? entry : worst
          )
        : null;
    const winRate =
      totalDays > 0 ? (winningEntries.length / totalDays) * 100 : 0;
    const averageWin =
      winningEntries.length > 0
        ? winningEntries.reduce((sum, entry) => sum + entry.amount, 0) /
          winningEntries.length
        : 0;
    const averageLoss =
      losingEntries.length > 0
        ? losingEntries.reduce((sum, entry) => sum + entry.amount, 0) /
          losingEntries.length
        : 0;

    let currentStreakType: "win" | "loss" | "flat" | null = null;
    let currentStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;

    const chronological = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    for (const entry of chronological) {
      const nextType = entry.amount > 0 ? "win" : entry.amount < 0 ? "loss" : "flat";
      if (nextType === currentStreakType) {
        currentStreak += 1;
      } else {
        currentStreakType = nextType;
        currentStreak = 1;
      }

      if (nextType === "win") {
        longestWinStreak = Math.max(longestWinStreak, currentStreak);
      }

      if (nextType === "loss") {
        longestLossStreak = Math.max(longestLossStreak, currentStreak);
      }
    }

    return {
      totalDays,
      averageDaily,
      bestDay,
      worstDay,
      winRate,
      averageWin,
      averageLoss,
      longestWinStreak,
      longestLossStreak,
    };
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

  function openEditModal(entry: PnlEntry) {
    setEditingEntry(entry);
    setEditAmount(String(entry.amount));
    setEditDate(entry.date);
    setEditNote(entry.note ?? "");
    setError(null);
  }

  function closeEditModal() {
    if (isUpdatingEntry) return;
    setEditingEntry(null);
    setEditAmount("");
    setEditDate("");
    setEditNote("");
  }

  async function handleUpdateEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !editingEntry) return;

    const firebaseDb = getFirebaseDb();
    if (!firebaseDb) {
      setError("Firebase is not configured yet. Add your keys to .env.local.");
      return;
    }

    const parsedAmount = Number(editAmount);
    if (!Number.isFinite(parsedAmount)) {
      setError("Enter a valid profit or loss amount.");
      return;
    }

    setError(null);
    setIsUpdatingEntry(true);

    try {
      if (editDate !== editingEntry.date) {
        await deleteDoc(doc(firebaseDb, "users", user.uid, "pnlEntries", editingEntry.date));
      }

      await setDoc(doc(firebaseDb, "users", user.uid, "pnlEntries", editDate), {
        amount: parsedAmount,
        date: editDate,
        note: editNote.trim(),
        updatedAt: serverTimestamp(),
      });

      closeEditModal();
    } catch {
      setError("Could not update your P&L entry. Check your Firestore rules and config.");
    } finally {
      setIsUpdatingEntry(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 md:hidden">
        {user ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
            <button
              type="button"
              onClick={() => setIsMobileAccountMenuOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Account
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  {user.displayName ?? user.email}
                </p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
                {isMobileAccountMenuOpen ? "Close" : "Open"}
              </span>
            </button>

            {isMobileAccountMenuOpen ? (
              <div className="mt-3 border-t border-white/10 pt-3">
                <button
                  onClick={() => {
                    const firebaseAuth = getFirebaseAuth();
                    if (firebaseAuth) {
                      void signOut(firebaseAuth);
                    }
                  }}
                  className="w-full rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        ) : authLoading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center text-sm text-white/70">
            Checking your session...
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
            >
              Continue with Google
            </button>
          </div>
        )}
      </div>

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
            <p className="mt-4 hidden max-w-xl text-sm leading-6 text-white/70 sm:text-base md:block">
              Sign in with Google, record your result for the day, and keep an
              at-a-glance history of your trading performance.
            </p>
          </div>

          <div className="hidden rounded-3xl border border-white/10 bg-slate-950/40 p-4 md:block">
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
              <div className="flex justify-center">
                <button
                  onClick={handleGoogleSignIn}
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
                >
                  Continue with Google
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <section className="mt-6 md:hidden">
        <div className="rounded-2xl border border-white/10 bg-[#102617]/95 p-1 shadow-glow backdrop-blur">
          <div className="grid grid-cols-4 gap-1">
            {([
              { key: "weekly", label: "Week" },
              { key: "monthly", label: "Month" },
              { key: "ytd", label: "Year" },
              { key: "total", label: "All time" },
            ] as const).map((option) => {
              const isActive = selectedRange === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedRange(option.key)}
                  className={`rounded-xl px-2 py-3 text-xs font-semibold transition ${
                    isActive
                      ? "bg-[#42dd78] text-[#06210f]"
                      : "text-white/65 hover:bg-white/[0.05]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-8 hidden flex-wrap gap-2 md:flex">
        {([
          { key: "weekly", label: "Weekly" },
          { key: "monthly", label: "Monthly" },
          { key: "ytd", label: "YTD" },
          { key: "total", label: "Total" },
        ] as const).map((option) => {
          const isActive = selectedRange === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setSelectedRange(option.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-accent text-slate-950"
                  : "border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </section>

      <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        <SummaryCard
          label={getRangeLabel(selectedRange, selectedMonth)}
          value={moneyFormatter.format(totals.net)}
          tone={totals.net >= 0 ? "profit" : "loss"}
          className="col-span-2 md:col-span-1"
        />
        <SummaryCard label="Winning days" value={String(totals.profitableDays)} />
        <SummaryCard label="Losing days" value={String(totals.losingDays)} />
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[360px,1fr]">
        <div className="rounded-[28px] border border-white/10 bg-panel/80 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Log today&apos;s result</h2>
              <p className="mt-2 text-sm text-white/60">
                Save one entry per day. Updating the same date will replace that
                day&apos;s value.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEntryFormOpen((current) => !current)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.08]"
            >
              {isEntryFormOpen ? "Minimize" : "Expand"}
            </button>
          </div>

          {isEntryFormOpen ? (
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
          ) : (
            <button
              type="button"
              onClick={() => setIsEntryFormOpen(true)}
              className="relative mt-6 block w-full rounded-2xl border-2 border-dashed border-white/15 p-10 text-center transition hover:border-white/25 focus:outline-2 focus:outline-offset-2 focus:outline-accent"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 48 48"
                aria-hidden="true"
                className="mx-auto h-12 w-12 text-white/40"
              >
                <path
                  d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="mt-2 block text-sm font-semibold text-white">
                Add a new daily P&amp;L entry
              </span>
            </button>
          )}
        </div>

        <div>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Daily history</h2>
              <p className="text-sm text-white/60">
                Filter the cards to a single month while keeping your saved data in Firestore.
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Month</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent sm:min-w-44"
              />
            </label>
          </div>

          {!user ? (
            <EmptyState message="Sign in with Google to start tracking your daily results." />
          ) : entries.length === 0 ? (
            <EmptyState message="No entries yet. Add your first trading day to start building the timeline." />
          ) : (
            <>
              <div className="md:hidden">
                {activeMobileTab === "calendar" ? (
                  <>
                    <div className="mb-4 flex items-center justify-between px-1">
                      <button
                        type="button"
                        onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                        className="rounded-full px-2 py-1 text-lg text-white/75"
                        aria-label="Previous month"
                      >
                        {"<"}
                      </button>
                      <p className="text-base font-semibold">{getMonthLabel(selectedMonth)}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                        className="rounded-full px-2 py-1 text-lg text-white/75"
                        aria-label="Next month"
                      >
                        {">"}
                      </button>
                    </div>

                    <div className="mb-2 grid grid-cols-5 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                      {daysOfWeek.map((day) => (
                        <div key={day}>{day}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {calendarDays.map((cell) => {
                        if (!cell.dayNumber) {
                          return <div key={cell.key} className="aspect-[0.82]" />;
                        }

                        const amount = cell.entry?.amount;
                        const toneClass =
                          amount == null
                            ? "bg-[#182236] text-white/65"
                            : amount >= 0
                              ? "bg-[#1f7a43] text-white"
                              : "bg-[#9e2f2f] text-white";

                        return (
                          <article
                            key={cell.key}
                            onClick={() => {
                              if (cell.entry) {
                                openEditModal(cell.entry);
                              }
                            }}
                            className={`aspect-[0.82] rounded-2xl border border-white/8 p-2 ${
                              cell.entry ? "cursor-pointer" : ""
                            } ${toneClass}`}
                          >
                            <div className="flex h-full flex-col justify-between">
                              <p className="text-center text-xs font-medium opacity-85">
                                {cell.dayNumber}
                              </p>
                              <p
                                className={`text-center font-semibold leading-tight ${getAmountTextClass(
                                  amount ?? 0,
                                  true
                                )}`}
                              >
                                {amount == null
                                  ? "-"
                                  : moneyFormatter.format(amount).replace(".00", "")}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                ) : activeMobileTab === "analytics" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <AnalyticsCard
                        label="Win rate"
                        value={`${analytics.winRate.toFixed(0)}%`}
                      />
                      <AnalyticsCard
                        label="Trading days"
                        value={String(analytics.totalDays)}
                      />
                      <AnalyticsCard
                        label="Avg day"
                        value={moneyFormatter.format(analytics.averageDaily)}
                        tone={analytics.averageDaily >= 0 ? "profit" : "loss"}
                      />
                      <AnalyticsCard
                        label="Avg win"
                        value={moneyFormatter.format(analytics.averageWin)}
                        tone="profit"
                      />
                      <AnalyticsCard
                        label="Avg loss"
                        value={moneyFormatter.format(analytics.averageLoss)}
                        tone="loss"
                      />
                      <AnalyticsCard
                        label="Best day"
                        value={
                          analytics.bestDay
                            ? moneyFormatter.format(analytics.bestDay.amount)
                            : "$0.00"
                        }
                        tone="profit"
                      />
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-sm text-white/55">Performance notes</p>
                      <div className="mt-4 space-y-3 text-sm text-white/75">
                        <div className="flex items-center justify-between">
                          <span>Worst day</span>
                          <span className="font-semibold text-loss">
                            {analytics.worstDay
                              ? moneyFormatter.format(analytics.worstDay.amount)
                              : "$0.00"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Longest win streak</span>
                          <span className="font-semibold">{analytics.longestWinStreak}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Longest loss streak</span>
                          <span className="font-semibold">{analytics.longestLossStreak}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Best day date</span>
                          <span className="font-semibold">
                            {analytics.bestDay
                              ? dateFormatter.format(
                                  new Date(`${analytics.bestDay.date}T00:00:00`)
                                )
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-white/55">
                    Settings space is ready for profile, account, and preferences.
                  </div>
                )}
              </div>

              {filteredEntries.length === 0 ? (
                <div className="mt-4 hidden md:block">
                  <EmptyState message="No saved P&L entries for that month yet." />
                </div>
              ) : (
                <div className="hidden md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-3">
                  {filteredEntries.map((entry) => {
                    const isProfit = entry.amount >= 0;

                    return (
                      <article
                        key={entry.id}
                        onClick={() => openEditModal(entry)}
                        className="flex min-h-[220px] flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-glow"
                      >
                        <p className="text-sm text-white/50">
                          {dateFormatter.format(new Date(`${entry.date}T00:00:00`))}
                        </p>
                        <div className="flex flex-1 flex-col items-center justify-center">
                          <p
                            className={`text-center font-semibold ${getAmountTextClass(
                              entry.amount
                            )} ${
                              isProfit ? "text-profit" : "text-loss"
                            }`}
                          >
                            {moneyFormatter.format(entry.amount)}
                          </p>
                          <p className="mt-3 text-center text-xs uppercase tracking-[0.28em] text-white/45">
                            {isProfit ? "Profit day" : "Loss day"}
                          </p>
                        </div>
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
            </>
          )}
        </div>
      </section>

      <nav className="sticky bottom-3 z-20 mt-8 md:hidden">
        <div className="grid grid-cols-3 rounded-[28px] border border-white/10 bg-[#18251c]/95 p-2 shadow-glow backdrop-blur">
          <button
            type="button"
            onClick={() => setActiveMobileTab("calendar")}
            className={`rounded-2xl px-3 py-3 text-center text-sm font-medium ${
              activeMobileTab === "calendar"
                ? "bg-white/10 text-white"
                : "text-white/55"
            }`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab("analytics")}
            className={`rounded-2xl px-3 py-3 text-center text-sm font-medium ${
              activeMobileTab === "analytics"
                ? "bg-white/10 text-white"
                : "text-white/55"
            }`}
          >
            Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab("settings")}
            className={`rounded-2xl px-3 py-3 text-center text-sm font-medium ${
              activeMobileTab === "settings"
                ? "bg-white/10 text-white"
                : "text-white/55"
            }`}
          >
            Settings
          </button>
        </div>
      </nav>

      {editingEntry ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0f1a2b] p-6 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                  Edit entry
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {dateFormatter.format(new Date(`${editingEntry.date}T00:00:00`))}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/70"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleUpdateEntry} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Date</span>
                <input
                  type="date"
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                  disabled={isUpdatingEntry}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Profit / loss</span>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(event) => setEditAmount(event.target.value)}
                  disabled={isUpdatingEntry}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Notes</span>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  disabled={isUpdatingEntry}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <button
                type="submit"
                disabled={isUpdatingEntry}
                className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdatingEntry ? "Saving changes..." : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function AnalyticsCard({
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
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className={`mt-3 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(year, monthNumber - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function getRangeLabel(range: RangeKey, month: string) {
  if (range === "weekly") return "Weekly P&L";
  if (range === "monthly") return `${month} P&L`;
  if (range === "ytd") return "YTD P&L";
  return "Total P&L";
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
  className = "",
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
  className?: string;
}) {
  const toneClass =
    tone === "profit"
      ? "text-profit"
      : tone === "loss"
        ? "text-loss"
        : "text-white";

  return (
    <div
      className={`rounded-[28px] border border-white/10 bg-white/[0.04] p-5 ${className}`}
    >
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
