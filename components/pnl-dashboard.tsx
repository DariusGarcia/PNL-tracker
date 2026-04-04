'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import { getFirebaseAuth, getFirebaseDb, googleProvider } from '@/lib/firebase'

import { DesktopAccountPanel, MobileAccountPanel } from './pnl-dashboard/account-panel'
import { AnalyticsOverview } from './pnl-dashboard/analytics-panel'
import { CalendarGrid, MonthNavigator } from './pnl-dashboard/calendar-grid'
import { EmptyState, SummaryCard } from './pnl-dashboard/cards'
import { EditEntryModal } from './pnl-dashboard/edit-entry-modal'
import { EntryFormCard } from './pnl-dashboard/entry-form-card'
import { MobileBottomNav } from './pnl-dashboard/mobile-bottom-nav'
import {
  DesktopRangeSelector,
  MobileRangeSelector,
} from './pnl-dashboard/range-selector'
import type { MobileTabKey, PnlEntry, RangeKey } from './pnl-dashboard/types'
import {
  buildCalendarDays,
  calculateAnalytics,
  calculateTotals,
  dateFormatter,
  getCurrentMonth,
  getMonthLabel,
  getRangeLabel,
  getToday,
  getWeekStart,
  moneyFormatter,
  shiftMonth,
} from './pnl-dashboard/utils'

export function PnlDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [entries, setEntries] = useState<PnlEntry[]>([])
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(getToday)
  const [note, setNote] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [selectedRange, setSelectedRange] = useState<RangeKey>('total')
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false)
  const [isMobileAccountMenuOpen, setIsMobileAccountMenuOpen] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTabKey>('calendar')
  const [editingEntry, setEditingEntry] = useState<PnlEntry | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editNote, setEditNote] = useState('')
  const [isUpdatingEntry, setIsUpdatingEntry] = useState(false)
  const [isDeletingEntry, setIsDeletingEntry] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const firebaseAuth = getFirebaseAuth()
    if (!firebaseAuth) {
      setAuthLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser)
      setAuthLoading(false)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!user) {
      setEntries([])
      return
    }

    const firebaseDb = getFirebaseDb()
    if (!firebaseDb) {
      setError('Firebase is not configured yet. Add your keys to .env.local.')
      return
    }

    const pnlQuery = query(
      collection(firebaseDb, 'users', user.uid, 'pnlEntries'),
      orderBy('date', 'desc'),
    )

    const unsubscribe = onSnapshot(
      pnlQuery,
      (snapshot) => {
        const nextEntries = snapshot.docs.map((entry) => {
          const data = entry.data()
          return {
            id: entry.id,
            amount: Number(data.amount ?? 0),
            date: String(data.date ?? entry.id),
            note: data.note ? String(data.note) : '',
          }
        })
        setEntries(nextEntries)
      },
      () => {
        setError('Could not load your P&L history. Check your Firebase setup.')
      },
    )

    return unsubscribe
  }, [user])

  const filteredEntries = useMemo(
    () => entries.filter((entry) => entry.date.startsWith(selectedMonth)),
    [entries, selectedMonth],
  )

  const calendarDays = useMemo(
    () => buildCalendarDays(selectedMonth, filteredEntries),
    [filteredEntries, selectedMonth],
  )

  const rangeEntries = useMemo(() => {
    const currentYear = new Date().getFullYear().toString()
    const weekStart = getWeekStart()

    if (selectedRange === 'weekly') {
      return entries.filter((entry) => entry.date >= weekStart)
    }

    if (selectedRange === 'monthly') {
      return filteredEntries
    }

    if (selectedRange === 'ytd') {
      return entries.filter((entry) => entry.date.startsWith(currentYear))
    }

    return entries
  }, [entries, filteredEntries, selectedRange])

  const totals = useMemo(() => calculateTotals(rangeEntries), [rangeEntries])
  const analytics = useMemo(() => calculateAnalytics(entries), [entries])
  const userLabel = user?.displayName ?? user?.email

  async function handleGoogleSignIn() {
    setError(null)
    try {
      const firebaseAuth = getFirebaseAuth()
      if (!firebaseAuth) {
        setError('Add your Firebase web app keys to .env.local first.')
        return
      }

      await signInWithPopup(firebaseAuth, googleProvider)
    } catch {
      setError('Google sign-in failed. Make sure the provider is enabled in Firebase.')
    }
  }

  function handleSignOut() {
    const firebaseAuth = getFirebaseAuth()
    if (firebaseAuth) {
      void signOut(firebaseAuth)
    }
  }

  async function handleSaveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    const firebaseDb = getFirebaseDb()
    if (!firebaseDb) {
      setError('Firebase is not configured yet. Add your keys to .env.local.')
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount)) {
      setError('Enter a valid profit or loss amount.')
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      await setDoc(doc(firebaseDb, 'users', user.uid, 'pnlEntries', date), {
        amount: parsedAmount,
        date,
        note: note.trim(),
        updatedAt: serverTimestamp(),
      })

      setAmount('')
      setNote('')
      setDate(getToday())
    } catch {
      setError('Could not save your P&L entry. Check your Firestore rules and config.')
    } finally {
      setIsSaving(false)
    }
  }

  function openEditModal(entry: PnlEntry) {
    setEditingEntry(entry)
    setEditAmount(String(entry.amount))
    setEditDate(entry.date)
    setEditNote(entry.note ?? '')
    setError(null)
  }

  function closeEditModal() {
    if (isUpdatingEntry || isDeletingEntry) return
    setEditingEntry(null)
    setEditAmount('')
    setEditDate('')
    setEditNote('')
  }

  async function handleUpdateEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !editingEntry) return

    const firebaseDb = getFirebaseDb()
    if (!firebaseDb) {
      setError('Firebase is not configured yet. Add your keys to .env.local.')
      return
    }

    const parsedAmount = Number(editAmount)
    if (!Number.isFinite(parsedAmount)) {
      setError('Enter a valid profit or loss amount.')
      return
    }

    setError(null)
    setIsUpdatingEntry(true)

    try {
      if (editDate !== editingEntry.date) {
        await deleteDoc(doc(firebaseDb, 'users', user.uid, 'pnlEntries', editingEntry.date))
      }

      await setDoc(doc(firebaseDb, 'users', user.uid, 'pnlEntries', editDate), {
        amount: parsedAmount,
        date: editDate,
        note: editNote.trim(),
        updatedAt: serverTimestamp(),
      })

      closeEditModal()
    } catch {
      setError('Could not update your P&L entry. Check your Firestore rules and config.')
    } finally {
      setIsUpdatingEntry(false)
    }
  }

  async function handleDeleteEntry() {
    if (!user || !editingEntry) return

    const confirmed = window.confirm(
      `Delete the P&L entry for ${dateFormatter.format(new Date(`${editingEntry.date}T00:00:00`))}?`,
    )

    if (!confirmed) {
      return
    }

    const firebaseDb = getFirebaseDb()
    if (!firebaseDb) {
      setError('Firebase is not configured yet. Add your keys to .env.local.')
      return
    }

    setError(null)
    setIsDeletingEntry(true)

    try {
      await deleteDoc(doc(firebaseDb, 'users', user.uid, 'pnlEntries', editingEntry.date))
      closeEditModal()
    } catch {
      setError('Could not delete your P&L entry. Check your Firestore rules and config.')
    } finally {
      setIsDeletingEntry(false)
    }
  }

  useEffect(() => {
    if (activeMobileTab !== 'analytics') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      })
    }, 80)

    return () => window.clearTimeout(timeoutId)
  }, [activeMobileTab])

  return (
    <main
      id='top'
      className='mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-2 sm:px-6 lg:px-8'>
      <MobileAccountPanel
        authLoading={authLoading}
        userLabel={userLabel}
        isMobileMenuOpen={isMobileAccountMenuOpen}
        onToggleMobileMenu={() => setIsMobileAccountMenuOpen((current) => !current)}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
      />

      <section className='relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur md:p-10'>
        <div className='absolute inset-0 bg-[linear-gradient(135deg,rgba(61,213,152,0.08),transparent_35%,rgba(255,107,107,0.08))]' />
        <div className='relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
          <div className='max-w-2xl'>
            <p className='text-sm uppercase tracking-[0.35em] text-accent/80'>Stock journal</p>
            <h1 className='mt-3 font-sans text-xl font-semibold tracking-tight md:text-5xl'>
              Daily profit and loss, one clean dashboard.
            </h1>
            <p className='mt-4 hidden max-w-xl text-sm leading-6 text-white/70 sm:text-base md:block'>
              Sign in with Google, record your result for the day, and keep an at-a-glance
              history of your trading performance.
            </p>
          </div>

          <DesktopAccountPanel
            authLoading={authLoading}
            userLabel={userLabel}
            onGoogleSignIn={handleGoogleSignIn}
            onSignOut={handleSignOut}
          />
        </div>
      </section>

      {error ? (
        <div className='mt-6 rounded-2xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-red-100'>
          {error}
        </div>
      ) : null}

      <MobileRangeSelector selectedRange={selectedRange} onSelect={setSelectedRange} />
      <DesktopRangeSelector selectedRange={selectedRange} onSelect={setSelectedRange} />

      <section className='mt-8 grid grid-cols-2 gap-4 md:grid-cols-3'>
        <SummaryCard
          label={getRangeLabel(selectedRange, selectedMonth)}
          value={moneyFormatter.format(totals.net)}
          tone={totals.net >= 0 ? 'profit' : 'loss'}
          className='col-span-2 md:col-span-1'
        />
        <SummaryCard label='Winning days' value={String(totals.profitableDays)} />
        <SummaryCard label='Losing days' value={String(totals.losingDays)} />
      </section>

      <section className='mt-8 grid gap-8 lg:grid-cols-[360px,1fr]'>
        <EntryFormCard
          isEntryFormOpen={isEntryFormOpen}
          onToggleOpen={() => setIsEntryFormOpen((current) => !current)}
          onSubmit={handleSaveEntry}
          date={date}
          amount={amount}
          note={note}
          onDateChange={setDate}
          onAmountChange={setAmount}
          onNoteChange={setNote}
          canEdit={Boolean(user)}
          isSaving={isSaving}
        />

        <div>
          <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h2 className='text-xl font-semibold'>Daily history</h2>
              <a
                href='#desktop-analytics'
                className='mt-3 hidden text-sm font-medium text-accent transition hover:text-white md:inline-flex'>
                View analytics
              </a>
            </div>
            <div className='space-y-3'>
              <div className='hidden md:flex md:items-center md:justify-end md:gap-3'>
                <MonthNavigator
                  monthLabel={getMonthLabel(selectedMonth)}
                  onPrevious={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                  onNext={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                />
              </div>
              <label className='block'>
                <span className='mb-2 block text-sm text-white/70'>Month</span>
                <input
                  type='month'
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className='w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent sm:min-w-44'
                />
              </label>
            </div>
          </div>

          {!user ? (
            <EmptyState message='Sign in with Google to start tracking your daily results.' />
          ) : entries.length === 0 ? (
            <EmptyState message='No entries yet. Add your first trading day to start building the timeline.' />
          ) : (
            <>
              <div className='md:hidden'>
                {activeMobileTab === 'calendar' ? (
                  <>
                    <MonthNavigator
                      monthLabel={getMonthLabel(selectedMonth)}
                      onPrevious={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                      onNext={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                      compact
                    />
                    <CalendarGrid
                      calendarDays={calendarDays}
                      onEntryClick={(entry) => {
                        if (entry) {
                          openEditModal(entry)
                        }
                      }}
                      compact
                    />
                  </>
                ) : activeMobileTab === 'analytics' ? (
                  <AnalyticsOverview analytics={analytics} />
                ) : (
                  <div className='rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-white/55'>
                    Settings space is ready for profile, account, and preferences.
                  </div>
                )}
              </div>

              <div className='hidden md:block'>
                <CalendarGrid
                  calendarDays={calendarDays}
                  onEntryClick={(entry) => {
                    if (entry) {
                      openEditModal(entry)
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>
      </section>

      <section id='desktop-analytics' className='mt-8 hidden md:block'>
        <div className='mb-4 flex items-end justify-between gap-4'>
          <div>
            <h2 className='text-xl font-semibold'>Analytics</h2>
            <p className='text-sm text-white/60'>
              A quick read on your trading performance across all saved entries.
            </p>
          </div>
          <a
            href='#top'
            className='text-sm font-medium text-white/60 transition hover:text-white'>
            Back to top
          </a>
        </div>

        <AnalyticsOverview analytics={analytics} />
      </section>

      <MobileBottomNav activeTab={activeMobileTab} onTabChange={setActiveMobileTab} />

      {editingEntry ? (
        <EditEntryModal
          editingEntry={editingEntry}
          editDate={editDate}
          editAmount={editAmount}
          editNote={editNote}
          isUpdatingEntry={isUpdatingEntry}
          isDeletingEntry={isDeletingEntry}
          onClose={closeEditModal}
          onSubmit={handleUpdateEntry}
          onDelete={handleDeleteEntry}
          onDateChange={setEditDate}
          onAmountChange={setEditAmount}
          onNoteChange={setEditNote}
        />
      ) : null}
    </main>
  )
}
