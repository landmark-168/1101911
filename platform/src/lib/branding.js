const KEY = 'smartpos_public_settings'

export function readCachedBranding() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}

export function applyBranding(settings, cache = true) {
  if (!settings) return
  const publicSettings = { general: settings.general || {}, brand: settings.brand || {} }
  if (cache) localStorage.setItem(KEY, JSON.stringify(publicSettings))
  window.__smartposSettings = publicSettings
  const color = publicSettings.brand.primary_color || '#f65a1b'
  document.documentElement.style.setProperty('--brand-color', color)
  document.documentElement.style.setProperty('--brand-color-dark', color)
  document.title = publicSettings.general.system_name || 'SmartPOS'
  replaceBrandNames(publicSettings.general.system_name || 'SmartPOS')
}

function replaceBrandNames(name) {
  if (name === 'SmartPOS') return
  requestAnimationFrame(() => {
    document.querySelectorAll('b, span').forEach(node => {
      if (node.textContent?.trim() === 'SmartPOS') node.textContent = name
    })
  })
}

export function watchBranding() {
  if (window.__smartposBrandObserver) return
  window.__smartposBrandObserver = new MutationObserver(() => {
    const settings = window.__smartposSettings
    if (settings) replaceBrandNames(settings.general?.system_name || 'SmartPOS')
    if (window.__smartposAdminIdentity) applyAdminIdentity(window.__smartposAdminIdentity)
  })
  window.__smartposBrandObserver.observe(document.body, { childList: true, subtree: true })
}

export function applyAdminIdentity(summary) {
  if (!summary?.user) return
  window.__smartposAdminIdentity = summary
  const name = summary.profile?.full_name || summary.user.email?.split('@')[0] || 'Admin'
  const email = summary.profile?.email || summary.user.email || ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const initials = (parts.length > 1 ? parts.slice(0, 2).map(x => x[0]).join('') : name.slice(0, 2)).toUpperCase()
  requestAnimationFrame(() => {
    document.querySelectorAll('aside, header').forEach(area => area.querySelectorAll('p, span, b').forEach(node => {
      const value = node.textContent?.trim()
      const next = value === 'Super Admin' ? name : value === 'admin@smartpos.co' ? email : value === 'SA' ? initials : null
      if (next && next !== value) node.textContent = next
    }))
    if (location.pathname.startsWith('/admin')) {
      document.querySelectorAll('header').forEach(header => renderAdminProfile(header, {name,email,initials}))
      document.querySelectorAll('aside').forEach(aside => renderAdminSidebarProfile(aside, {name,email,initials}))
    }
  })
}

function renderAdminProfile(header, identity) {
  if (header.querySelector('[data-admin-profile]')) return
  header.querySelectorAll('.lucide-bell').forEach(icon => { const button=icon.closest('button');if(button)button.style.display='none' })
  header.querySelectorAll('button, span').forEach(node => {
    if (node.textContent?.trim()===identity.initials || node.textContent?.trim()==='SA') {
      const target=node.closest('button')||node
      target.style.display='none'
      const sibling=target.nextElementSibling
      if(sibling && (sibling.textContent?.includes(identity.name)||sibling.textContent?.includes('ผู้ดูแลระบบ'))) sibling.style.display='none'
    }
  })
  const wrap=document.createElement('div');wrap.dataset.adminProfile='true';wrap.className='ml-3 flex items-center gap-3 sm:ml-auto'
  const bell=document.createElement('button');bell.className='relative grid size-10 place-items-center rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50';bell.setAttribute('aria-label','การแจ้งเตือน');bell.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><span class="absolute right-2 top-2 size-2 rounded-full bg-orange-500 ring-2 ring-white"></span>'
  const divider=document.createElement('span');divider.className='hidden h-8 w-px bg-zinc-200 sm:block'
  const avatar=document.createElement('span');avatar.className='grid size-10 place-items-center rounded-xl bg-zinc-950 text-xs font-black text-white';avatar.textContent=identity.initials
  const info=document.createElement('div');info.className='hidden min-w-0 text-left md:block'
  const name=document.createElement('p');name.className='max-w-40 truncate text-xs font-bold';name.textContent=identity.name
  const role=document.createElement('p');role.className='mt-0.5 text-[10px] text-zinc-400';role.textContent='ผู้ดูแลระบบ'
  const arrow=document.createElement('span');arrow.className='hidden text-zinc-400 md:block';arrow.textContent='⌄'
  info.append(name,role);wrap.append(bell,divider,avatar,info,arrow);header.append(wrap)
}

function renderAdminSidebarProfile(aside, identity) {
  if (aside.querySelector('[data-admin-sidebar-profile]')) return
  aside.querySelectorAll('.mt-auto').forEach(node => {
    const text=node.textContent||''
    if(text.includes(identity.name)||text.includes(identity.email)||text.includes('Super Admin')||text.includes('admin@smartpos.co')) node.style.display='none'
  })
  const card=document.createElement('div');card.dataset.adminSidebarProfile='true';card.className='mt-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5'
  const avatar=document.createElement('span');avatar.className='grid size-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-xs font-black text-white';avatar.textContent=identity.initials
  const info=document.createElement('div');info.className='min-w-0 flex-1'
  const name=document.createElement('p');name.className='truncate text-xs font-bold text-white';name.textContent=identity.name
  const email=document.createElement('p');email.className='mt-1 truncate text-[10px] text-zinc-500';email.textContent=identity.email
  const arrow=document.createElement('span');arrow.className='text-sm text-zinc-600';arrow.textContent='›'
  info.append(name,email);card.append(avatar,info,arrow);aside.append(card)
}
