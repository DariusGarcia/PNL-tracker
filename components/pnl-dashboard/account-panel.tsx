type AccountPanelProps = {
  authLoading: boolean
  userLabel?: string | null
  isMobileMenuOpen?: boolean
  onToggleMobileMenu?: () => void
  onGoogleSignIn: () => void
  onSignOut: () => void
}

export function MobileAccountPanel({
  authLoading,
  userLabel,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
  onGoogleSignIn,
  onSignOut,
}: AccountPanelProps) {
  return (
    <div className='mb-4 md:hidden'>
      {userLabel ? (
        <div className='rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
          <button
            type='button'
            onClick={onToggleMobileMenu}
            className='flex w-full items-center justify-between gap-3 text-left'>
            <div>
              <p className='text-xs uppercase tracking-[0.24em] text-white/45'>Account</p>
              <p className='mt-1 text-sm font-medium text-white'>{userLabel}</p>
            </div>
            <span className='rounded-full border border-white/10 px-3 py-1 text-xs text-white/70'>
              {isMobileMenuOpen ? 'Close' : 'Open'}
            </span>
          </button>

          {isMobileMenuOpen ? (
            <div className='mt-3 border-t border-white/10 pt-3'>
              <button
                onClick={onSignOut}
                className='w-full rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5'>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      ) : authLoading ? (
        <div className='rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center text-sm text-white/70'>
          Checking your session...
        </div>
      ) : (
        <div className='rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
          <button
            type='button'
            onClick={onGoogleSignIn}
            className='w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]'>
            Continue with Google
          </button>
        </div>
      )}
    </div>
  )
}

export function DesktopAccountPanel({
  authLoading,
  userLabel,
  onGoogleSignIn,
  onSignOut,
}: AccountPanelProps) {
  return (
    <div className='hidden rounded-3xl border border-white/10 bg-slate-950/40 p-4 md:block'>
      {authLoading ? (
        <p className='text-sm text-white/70'>Checking your session...</p>
      ) : userLabel ? (
        <div className='space-y-3'>
          <div>
            <p className='text-sm text-white/60'>Signed in as</p>
            <p className='font-medium'>{userLabel}</p>
          </div>
          <button
            onClick={onSignOut}
            className='rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5'>
            Sign out
          </button>
        </div>
      ) : (
        <div className='flex justify-center'>
          <button
            onClick={onGoogleSignIn}
            className='rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]'>
            Continue with Google
          </button>
        </div>
      )}
    </div>
  )
}
