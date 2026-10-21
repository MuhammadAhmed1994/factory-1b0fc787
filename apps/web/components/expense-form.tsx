'use client'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { api, errorMessage, fieldErrors, type Expense } from '@/lib/api'
import { useToast } from './toast'
import { CategorySelect, Field, useCategories } from './ui'

const today = () => new Date().toISOString().slice(0, 10)

export function ExpenseForm({ expense }: { expense?: Expense }) {
  const router = useRouter()
  const toast = useToast()
  const categories = useCategories()
  const [title, setTitle] = useState(expense?.title ?? '')
  const [amount, setAmount] = useState(expense?.amount ?? '')
  const [date, setDate] = useState(expense?.date ?? today())
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const local: Record<string, string> = {}
    if (!title.trim()) local.title = 'Title is required'
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || Number(amount) <= 0) {
      local.amount = 'Enter an amount greater than 0 (up to 2 decimals)'
    }
    if (!date) local.date = 'Date is required'
    if (!categoryId) local.categoryId = 'Category is required'
    setErrors(local)
    setFormError('')
    if (Object.keys(local).length) return
    setBusy(true)
    const input = { title: title.trim(), amount: amount.trim(), date, categoryId }
    try {
      if (expense) await api.updateExpense(expense.id, input)
      else await api.createExpense(input)
      toast.success(expense ? 'Expense updated' : 'Expense added')
      router.push('/expenses')
    } catch (err) {
      setErrors(fieldErrors(err))
      setFormError(errorMessage(err))
      toast.error(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="card">
      {formError && (
        <p className="alert alert-error">{formError}</p>
      )}
      <Field label="Title" name="title" value={title} onChange={setTitle} error={errors.title} />
      <Field label="Amount ($)" name="amount" inputMode="decimal" value={amount} onChange={setAmount} error={errors.amount} />
      <Field label="Date" name="date" type="date" value={date} onChange={setDate} error={errors.date} />
      <CategorySelect
        value={categoryId}
        onChange={setCategoryId}
        categories={categories}
        emptyLabel="Select a category"
        error={errors.categoryId}
      />
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {expense ? 'Save changes' : 'Add expense'}
      </button>
    </form>
  )
}
