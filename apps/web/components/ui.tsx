'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { api, money, type Category, type Expense } from '@/lib/api'

export function Field(props: {
  label: string
  name: string
  type?: string
  value: string
  onChange: (v: string) => void
  error?: string
  inputMode?: 'decimal'
  autoComplete?: string
}) {
  const id = `f-${props.name}`
  return (
    <div className="field">
      <label htmlFor={id}>{props.label}</label>
      <input
        id={id}
        name={props.name}
        type={props.type ?? 'text'}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        value={props.value}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `${id}-err` : undefined}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.error && (
        <p id={`${id}-err`} className="field-error">
          {props.error}
        </p>
      )}
    </div>
  )
}

export function CategorySelect(props: {
  label?: string
  value: string
  onChange: (v: string) => void
  categories: Category[]
  emptyLabel: string
  error?: string
}) {
  return (
    <div className="field">
      <label htmlFor="f-category">{props.label ?? 'Category'}</label>
      <select
        id="f-category"
        name="category"
        value={props.value}
        aria-invalid={props.error ? true : undefined}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="">{props.emptyLabel}</option>
        {props.categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {props.error && <p className="field-error">{props.error}</p>}
    </div>
  )
}

export function useCategories(): Category[] {
  const [cats, setCats] = useState<Category[]>([])
  useEffect(() => {
    let alive = true
    api
      .categories()
      .then((c) => alive && setCats(c))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return cats
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function ExpenseRows({
  expenses,
  categories,
  actions,
}: {
  expenses: Expense[]
  categories: Category[]
  actions?: (e: Expense) => ReactNode
}) {
  const name = (id: string) => categories.find((c) => c.id === id)?.name ?? id
  return (
    <ul className="expense-list">
      {expenses.map((e) => (
        <li key={e.id} className="expense-row">
          <span className="expense-title">{e.title}</span>
          <span className="amount">{money(e.amount)}</span>
          <span className="muted">{e.date}</span>
          <span className="badge">{name(e.categoryId)}</span>
          {actions && <span className="row-actions">{actions(e)}</span>}
        </li>
      ))}
    </ul>
  )
}
