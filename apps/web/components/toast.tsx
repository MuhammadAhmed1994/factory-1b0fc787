'use client'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ToastItem {
  id: number
  kind: 'success' | 'error'
  text: string
}
interface ToastApi {
  success: (text: string) => void
  error: (text: string) => void
}

const noop: ToastApi = { success: () => {}, error: () => {} }
const Ctx = createContext<ToastApi>(noop)
export const useToast = () => useContext(Ctx)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), [])
  const push = useCallback(
    (kind: ToastItem['kind'], text: string) => {
      const id = nextId++
      setItems((l) => [...l, { id, kind, text }])
      if (kind === 'success') setTimeout(() => dismiss(id), 5000)
    },
    [dismiss],
  )
  const api: ToastApi = { success: (t) => push('success', t), error: (t) => push('error', t) }
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span>{t.text}</span>
            {t.kind === 'error' && (
              <button type="button" className="btn btn-ghost" onClick={() => dismiss(t.id)}>
                Dismiss
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
