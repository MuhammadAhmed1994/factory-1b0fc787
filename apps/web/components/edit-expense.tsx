'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api, ApiError, errorMessage, money, type Expense } from '@/lib/api'
import { ExpenseForm } from './expense-form'
import { useToast } from './toast'
import { EmptyState } from './ui'

export function EditExpense({ id }: { id: string }) {
  const router = useRouter()
  const toast = useToast()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    api
      .getExpense(id)
      .then((e) => {
        setExpense(e)
        setState('ok')
      })
      .catch((e) => setState(e instanceof ApiError && e.status === 404 ? 'missing' : 'error'))
  }, [id])

  async function remove() {
    try {
      await api.deleteExpense(id)
      toast.success('Expense deleted')
      router.push('/expenses')
    } catch (e) {
      toast.error(errorMessage(e))
      setConfirming(false)
    }
  }

  if (state === 'loading') return <p className="muted">Loading…</p>
  if (state === 'missing') return <EmptyState>This expense was not found.</EmptyState>
  if (state === 'error' || !expense) return <p role="alert" className="alert alert-error">Could not load the expense.</p>

  return (
    <>
      <h1>Edit expense</h1>
      <ExpenseForm expense={expense} />
      <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
        Delete expense
      </button>
      {confirming && (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="del-title">
            <h2 id="del-title">Delete expense?</h2>
            <p>
              {expense.title} — {money(expense.amount)}
            </p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" autoFocus onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={remove}>
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
