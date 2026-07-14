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
  })
  window.__smartposBrandObserver.observe(document.body, { childList: true, subtree: true })
}
