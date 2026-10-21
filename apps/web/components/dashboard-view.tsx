'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api, errorMessage, money, type Dashboard } from '@/lib/api'
import { EmptyState, ExpenseRows, useCategories } from './ui'

export function DashboardView() {
  const categories = useCategories()
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(errorMessage(e)))
  }, [])

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <Link href="/expenses/new" className="btn btn-primary">
          Add expense
        </Link>
      </div>
      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}
      {!error && !data && <p className="muted">Loading…</p>}
      {data && (
        <>
          <div className="stats">
            <div className="card">
              <span className="muted">Spent this month</span>
              <p className="big" data-testid="total">
                {money(data.total)}
              </p>
            </div>
            <div className="card">
              <span className="muted">Transactions</span>
              <p className="big" data-testid="count">
                {data.count}
              </p>
            </div>
          </div>
          <h2>Recent spending</h2>
          {data.recent.length === 0 ? (
            <EmptyState>No expenses this month yet. Add one to get started.</EmptyState>
          ) : (
            <ExpenseRows expenses={data.recent} categories={categories} />
          )}
        </>
      )}
      <Link href="/expenses/new" className="btn btn-primary fab" aria-label="Add expense (quick)">
        +
      </Link>
    </>
  )
}
