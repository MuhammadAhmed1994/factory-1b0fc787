import { apiRequest, ApiError } from './api-client'

export interface Category {
  id: string
  name: string
}
export interface Expense {
  id: string
  title: string
  amount: string
  date: string
  categoryId: string
}
export interface ExpenseInput {
  title: string
  amount: string
  date: string
  categoryId: string
}
export interface Dashboard {
  month: string
  total: string
  count: number
  recent: Expense[]
}
export interface Summary {
  month: string
  total: string
  breakdown: { categoryId: string; category: string; amount: string; count: number }[]
}
export interface ExpenseFilters {
  search?: string
  category?: string
  from?: string
  to?: string
}
export interface User {
  id: string
  email: string
}

const json = (body: unknown) => ({ body: JSON.stringify(body) })

export const api = {
  register: (email: string, password: string) =>
    apiRequest<User>('/auth/register', { method: 'POST', ...json({ email, password }) }),
  login: (email: string, password: string) =>
    apiRequest<User>('/auth/login', { method: 'POST', ...json({ email, password }) }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  me: () => apiRequest<User>('/auth/me'),
  categories: () => apiRequest<Category[]>('/categories'),
  listExpenses: (f: ExpenseFilters = {}) => {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(f)) if (v) qs.set(k, v)
    const s = qs.toString()
    return apiRequest<Expense[]>(`/expenses${s ? `?${s}` : ''}`)
  },
  getExpense: (id: string) => apiRequest<Expense>(`/expenses/${encodeURIComponent(id)}`),
  createExpense: (input: ExpenseInput) => apiRequest<Expense>('/expenses', { method: 'POST', ...json(input) }),
  updateExpense: (id: string, input: ExpenseInput) =>
    apiRequest<Expense>(`/expenses/${encodeURIComponent(id)}`, { method: 'PATCH', ...json(input) }),
  deleteExpense: (id: string) => apiRequest<void>(`/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  dashboard: () => apiRequest<Dashboard>('/dashboard'),
  summary: (month: string) => apiRequest<Summary>(`/summary?month=${encodeURIComponent(month)}`),
}

/** Field-level errors from a 400 response: { field: message }. */
export function fieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (err instanceof ApiError && typeof err.details === 'object' && err.details !== null) {
    const errors = (err.details as { errors?: { field: string; message: string }[] }).errors
    if (Array.isArray(errors)) for (const e of errors) out[e.field] ??= e.message
  }
  return out
}

export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Something went wrong. Please try again.'

export const money = (amount: string): string => `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export { ApiError }
