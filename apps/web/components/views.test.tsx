import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { api, ApiError } from '@/lib/api'
import { DashboardView } from './dashboard-view'
import { ExpenseForm } from './expense-form'
import { ExpensesView } from './expenses-view'
import { SummaryView } from './summary-view'
import { ToastProvider } from './toast'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: jest.fn() }), usePathname: () => '/' }))
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  return {
    ...actual,
    api: {
      categories: jest.fn(),
      dashboard: jest.fn(),
      listExpenses: jest.fn(),
      createExpense: jest.fn(),
      updateExpense: jest.fn(),
      deleteExpense: jest.fn(),
      summary: jest.fn(),
    },
  }
})
const m = api as jest.Mocked<typeof api>
const cats = [
  { id: 'food', name: 'Food' },
  { id: 'bills', name: 'Bills' },
]
const exp = (o = {}) => ({ id: '1', title: 'Lunch', amount: '12.50', date: '2025-03-10', categoryId: 'food', ...o })
const wrap = (ui: React.ReactElement) => render(<ToastProvider>{ui}</ToastProvider>)

beforeEach(() => {
  jest.clearAllMocks()
  m.categories.mockResolvedValue(cats)
})

describe('expense form', () => {
  it('AC-12 requires a category', async () => {
    wrap(<ExpenseForm />)
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Tea' } })
    fireEvent.change(screen.getByLabelText('Amount ($)'), { target: { value: '3.20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(await screen.findByText('Category is required')).toBeInTheDocument()
    expect(m.createExpense).not.toHaveBeenCalled()
  })

  it('AC-13 saves from one form and shows success message', async () => {
    m.createExpense.mockResolvedValue(exp())
    wrap(<ExpenseForm />)
    await screen.findByRole('option', { name: 'Food' })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Tea' } })
    fireEvent.change(screen.getByLabelText('Amount ($)'), { target: { value: '3.20' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'food' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/expenses'))
    expect(m.createExpense).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tea', amount: '3.20', categoryId: 'food' }))
    expect(screen.getByRole('status')).toHaveTextContent('Expense added')
  })

  it('AC-13 failed request shows error', async () => {
    m.createExpense.mockRejectedValue(new ApiError(500, 'Server down'))
    wrap(<ExpenseForm />)
    await screen.findByRole('option', { name: 'Food' })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Tea' } })
    fireEvent.change(screen.getByLabelText('Amount ($)'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'food' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Server down')
    expect(push).not.toHaveBeenCalled()
  })
})

describe('expenses list', () => {
  it('AC-20 search and filters, no-results message', async () => {
    m.listExpenses.mockResolvedValueOnce([exp()]).mockResolvedValue([])
    wrap(<ExpensesView />)
    expect(await screen.findByText('Lunch')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search by title'), { target: { value: 'zzz' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'bills' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2025-01-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() =>
      expect(m.listExpenses).toHaveBeenLastCalledWith({ search: 'zzz', category: 'bills', from: '2025-01-01', to: '' }),
    )
    expect(await screen.findByText('No expenses match your filters.')).toBeInTheDocument()
  })

  it('AC-13 delete confirms, shows success and refreshes', async () => {
    m.listExpenses.mockResolvedValueOnce([exp()]).mockResolvedValue([])
    m.deleteExpense.mockResolvedValue(undefined)
    wrap(<ExpensesView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Lunch' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Expense deleted'))
    await waitFor(() => expect(screen.queryByText('Lunch')).not.toBeInTheDocument())
  })

  it('AC-13 failed delete shows error', async () => {
    m.listExpenses.mockResolvedValue([exp()])
    m.deleteExpense.mockRejectedValue(new ApiError(500, 'Boom'))
    wrap(<ExpensesView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Lunch' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Boom')
  })
})

describe('dashboard', () => {
  it('AC-25 dashboard links to the add form in one navigation action', async () => {
    m.dashboard.mockResolvedValue({ month: '2025-03', total: '0.00', count: 0, recent: [] })
    wrap(<DashboardView />)
    const links = await screen.findAllByRole('link', { name: /Add expense/ })
    for (const l of links) expect(l).toHaveAttribute('href', '/expenses/new')
  })

  it('AC-25 a new expense is saved from the single form without extra screens', async () => {
    m.createExpense.mockResolvedValue(exp())
    wrap(<ExpenseForm />)
    await screen.findByRole('option', { name: 'Food' })
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Tea' } })
    fireEvent.change(screen.getByLabelText('Amount ($)'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'food' } })
    expect((screen.getByLabelText('Date') as HTMLInputElement).value).not.toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    await waitFor(() => expect(m.createExpense).toHaveBeenCalledTimes(1))
  })

  it('AC-16 shows total, count, recent and add link', async () => {
    m.dashboard.mockResolvedValue({ month: '2025-03', total: '15.70', count: 2, recent: [exp()] })
    wrap(<DashboardView />)
    expect(await screen.findByTestId('total')).toHaveTextContent('$15.70')
    expect(screen.getByTestId('count')).toHaveTextContent('2')
    expect(screen.getByText('Lunch')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Add expense/ })[0]).toHaveAttribute('href', '/expenses/new')
  })

  it('AC-16 empty state', async () => {
    m.dashboard.mockResolvedValue({ month: '2025-03', total: '0.00', count: 0, recent: [] })
    wrap(<DashboardView />)
    expect(await screen.findByText(/No expenses this month yet/)).toBeInTheDocument()
  })
})

describe('summary', () => {
  it('AC-23 month picker loads total and breakdown, empty state', async () => {
    m.summary.mockResolvedValueOnce({
      month: '2025-02',
      total: '30.00',
      breakdown: [{ categoryId: 'food', category: 'Food', amount: '30.00', count: 2 }],
    })
    m.summary.mockResolvedValue({ month: '2025-01', total: '0.00', breakdown: [] })
    wrap(<SummaryView />)
    expect(await screen.findByText('Food')).toBeInTheDocument()
    expect(screen.getByTestId('total')).toHaveTextContent('$30.00')
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2025-01' } })
    expect(await screen.findByText(/No expenses recorded/)).toBeInTheDocument()
    expect(m.summary).toHaveBeenLastCalledWith('2025-01')
  })
})
