'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage, money, type Expense, type ExpenseFilters } from '@/lib/api'
import { useToast } from './toast'
import { CategorySelect, EmptyState, ExpenseRows, Field, useCategories } from './ui'

export function ExpensesView() {
  const toast = useToast()
  const categories = useCategories()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applied, setApplied] = useState<ExpenseFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [items, setItems] = useState<Expense[] | null>(null)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null)

  const load = useCallback(async (f: ExpenseFilters) => {
    setError('')
    try {
      setItems(await api.listExpenses(f))
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  useEffect(() => {
    void load(applied)
  }, [applied, load])

  const filtered = Boolean(applied.search || applied.category || applied.from || applied.to)
  const activeCount = [category, from, to].filter(Boolean).length

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await api.deleteExpense(pendingDelete.id)
      toast.success('Expense deleted')
      setPendingDelete(null)
      await load(applied)
    } catch (e) {
      toast.error(errorMessage(e))
      setPendingDelete(null)
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Expenses</h1>
        <Link href="/expenses/new" className="btn btn-primary">
          Add expense
        </Link>
      </div>
      <form
        className="card"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          setApplied({ search: search.trim(), category, from, to })
        }}
      >
        <Field label="Search by title" name="search" type="search" value={search} onChange={setSearch} />
        <button
          type="button"
          className="btn btn-secondary filters-toggle"
          aria-expanded={showFilters}
          onClick={() => setShowFilters((v) => !v)}
        >
          Filters{activeCount ? ` (${activeCount})` : ''}
        </button>
        <div className={`filters-extra${showFilters ? ' open' : ''}`}>
          <CategorySelect
            label="Category"
            value={category}
            onChange={setCategory}
            categories={categories}
            emptyLabel="All categories"
          />
          <Field label="From" name="from" type="date" value={from} onChange={setFrom} />
          <Field label="To" name="to" type="date" value={to} onChange={setTo} />
        </div>
        <button type="submit" className="btn btn-primary">
          Apply
        </button>{' '}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setSearch('')
            setCategory('')
            setFrom('')
            setTo('')
            setApplied({})
          }}
        >
          Clear filters
        </button>
      </form>

      {error && (
        <p role="alert" className="alert alert-error">
          {error}{' '}
          <button type="button" className="btn btn-ghost" onClick={() => void load(applied)}>
            Retry
          </button>
        </p>
      )}
      {!error && items === null && <p className="muted">Loading…</p>}
      {!error && items?.length === 0 && (
        <EmptyState>{filtered ? 'No expenses match your filters.' : 'No expenses yet. Add your first one.'}</EmptyState>
      )}
      {!error && items && items.length > 0 && (
        <ExpenseRows
          expenses={items}
          categories={categories}
          actions={(e) => (
            <>
              <Link href={`/expenses/${e.id}/edit`} className="btn btn-secondary" aria-label={`Edit ${e.title}`}>
                Edit
              </Link>
              <button type="button" className="btn btn-secondary" aria-label={`Delete ${e.title}`} onClick={() => setPendingDelete(e)}>
                Delete
              </button>
            </>
          )}
        />
      )}

      <Link href="/expenses/new" className="btn btn-primary fab" aria-label="Add expense (quick)">
        +
      </Link>

      {pendingDelete && (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="del-title">
            <h2 id="del-title">Delete expense?</h2>
            <p>
              {pendingDelete.title} — {money(pendingDelete.amount)}
            </p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" autoFocus onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
