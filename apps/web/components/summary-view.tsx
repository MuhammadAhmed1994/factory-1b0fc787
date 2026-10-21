'use client'
import { useEffect, useState } from 'react'
import { api, errorMessage, money, type Summary } from '@/lib/api'
import { EmptyState } from './ui'

const currentMonth = () => new Date().toISOString().slice(0, 7)

function shift(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

export function SummaryView() {
  const [month, setMonth] = useState(currentMonth())
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(month)) return
    let alive = true
    setError('')
    setData(null)
    api
      .summary(month)
      .then((s) => alive && setData(s))
      .catch((e) => alive && setError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [month])

  const totalNum = data ? Number(data.total) : 0

  return (
    <>
      <h1>Monthly summary</h1>
      <div className="month-row">
        <button type="button" className="btn btn-secondary" aria-label="Previous month" onClick={() => setMonth(shift(month, -1))}>
          ‹
        </button>
        <input
          type="month"
          aria-label="Month"
          value={month}
          max={currentMonth()}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary"
          aria-label="Next month"
          disabled={month >= currentMonth()}
          onClick={() => setMonth(shift(month, 1))}
        >
          ›
        </button>
      </div>
      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}
      {!error && !data && <p className="muted">Loading…</p>}
      {data && (
        <>
          <div className="card">
            <span className="muted">Total for {data.month}</span>
            <p className="big" data-testid="total">
              {money(data.total)}
            </p>
          </div>
          {data.breakdown.length === 0 ? (
            <EmptyState>No expenses recorded for this month.</EmptyState>
          ) : (
            <ul className="breakdown">
              {data.breakdown.map((b) => {
                const pct = totalNum > 0 ? Math.round((Number(b.amount) / totalNum) * 100) : 0
                return (
                  <li key={b.categoryId} className="card">
                    <div className="page-head">
                      <span>{b.category}</span>
                      <span className="amount">
                        {money(b.amount)} <span className="muted">({pct}%)</span>
                      </span>
                    </div>
                    <div className="bar-track" aria-hidden="true">
                      <div className="bar" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </>
  )
}
