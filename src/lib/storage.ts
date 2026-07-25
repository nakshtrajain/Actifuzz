// Unified storage: uses chrome.storage.local when running as the extension,
// falls back to localStorage when running via `npm run dev` in a normal browser tab.

declare const chrome: any

const hasChromeStorage =
  typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local

export async function getItem<T>(key: string, fallback: T): Promise<T> {
  if (hasChromeStorage) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result: any) => {
        resolve(result[key] === undefined ? fallback : result[key])
      })
    })
  }
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}
export async function setItem<T>(key: string, value: T): Promise<void> {
  if (hasChromeStorage) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime?.lastError) {
          console.error('storage.setItem failed:', key, chrome.runtime.lastError)
          reject(chrome.runtime.lastError)
          return
        }
        resolve()
      })
    })
  }
  localStorage.setItem(key, JSON.stringify(value))
}

// Live cross-tab sync: fires `callback` whenever `key` changes in ANY open tab/window,
// including tabs other than the one that made the change. In the real extension this is
// chrome.storage.onChanged, which Chrome broadcasts to every open extension page for free.
// In `npm run dev` (no chrome.storage available) it falls back to the native `storage`
// event, which browsers already fire in other same-origin tabs when localStorage changes.
export function onItemChange<T>(key: string, callback: (newValue: T | undefined) => void): () => void {
  if (hasChromeStorage) {
    const listener = (changes: Record<string, { newValue?: T }>, areaName: string) => {
      if (areaName === 'local' && key in changes) {
        callback(changes[key].newValue)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }
  const listener = (e: StorageEvent) => {
    if (e.key === key) {
      callback(e.newValue ? (JSON.parse(e.newValue) as T) : undefined)
    }
  }
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}