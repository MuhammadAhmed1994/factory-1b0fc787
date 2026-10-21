'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from '@/lib/api'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/summary', label: 'Summary' },
]

/** Protected layout: redirects to /login when there is no valid session. */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .me()
      .then(() => alive && setReady(true))
      .catch((e) => {
        if (!alive) return
        if (e instanceof ApiError && e.status === 401) router.replace('/login')
        else setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [router])

  async function logout() {
    try {
      await api.logout()
    } finally {
      router.replace('/login')
    }
  }

  if (failed) return <p role="alert" className="alert alert-error">Could not reach the server. Please reload.</p>
  if (!ready) return <p className="muted pad">Loading…</p>

  return (
    <div className="shell">
      <header className="topbar">
        <strong className="logo">Expense Tracker</strong>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <button type="button" className="btn btn-secondary" onClick={logout}>
          Log out
        </button>
      </header>
      <main className="content">{children}</main>
    </div>
  )
}
