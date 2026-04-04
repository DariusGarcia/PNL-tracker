import type { MobileTabKey } from './types'

export function MobileBottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: MobileTabKey
  onTabChange: (tab: MobileTabKey) => void
}) {
  return (
    <nav className='sticky bottom-3 z-20 mt-8 md:hidden'>
      <div className='grid grid-cols-3 rounded-[28px] border border-white/10 bg-[#18251c]/95 p-2 shadow-glow backdrop-blur'>
        {(['calendar', 'analytics', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            type='button'
            onClick={() => onTabChange(tab)}
            className={`rounded-2xl px-3 py-3 text-center text-sm font-medium ${
              activeTab === tab ? 'bg-white/10 text-white' : 'text-white/55'
            }`}>
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </nav>
  )
}
