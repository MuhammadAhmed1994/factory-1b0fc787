import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthForm } from './auth-form'
import { AppShell } from './app-shell'
import { api, ApiError } from '@/lib/api'

const push = jest.fn()
const replace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/dashboard',
}))
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api')
  return { ...actual, api: { register: jest.fn(), login: jest.fn(), me: jest.fn(), logout: jest.fn() } }
})

const mocked = api as jest.Mocked<typeof api>

beforeEach(() => jest.clearAllMocks())

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

describe('AuthForm', () => {
  it('AC-6 login success goes to dashboard', async () => {
    mocked.login.mockResolvedValue({ id: '1', email: 'a@x.com' })
    render(<AuthForm mode="login" />)
    fill('a@x.com', 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'))
  })

  it('AC-6 wrong credentials shows error and stays', async () => {
    mocked.login.mockRejectedValue(new ApiError(401, 'Invalid email or password'))
    render(<AuthForm mode="login" />)
    fill('a@x.com', 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(push).not.toHaveBeenCalled()
  })

  it('AC-6 register duplicate email shows error; invalid input blocked', async () => {
    mocked.register.mockRejectedValue(new ApiError(409, 'An account with this email already exists'))
    render(<AuthForm mode="register" />)
    fill('bad', 'short')
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(mocked.register).not.toHaveBeenCalled()
    fill('a@x.com', 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists')
    expect(push).not.toHaveBeenCalled()
  })

  it('AC-6 register success logs in and lands on dashboard', async () => {
    mocked.register.mockResolvedValue({ id: '1', email: 'a@x.com' })
    mocked.login.mockResolvedValue({ id: '1', email: 'a@x.com' })
    render(<AuthForm mode="register" />)
    fill('a@x.com', 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'))
  })
})

describe('AppShell', () => {
  it('AC-7 redirects to login when logged out', async () => {
    mocked.me.mockRejectedValue(new ApiError(401, 'Not authenticated'))
    render(<AppShell>secret</AppShell>)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'))
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('renders content when logged in', async () => {
    mocked.me.mockResolvedValue({ id: '1', email: 'a@x.com' })
    render(<AppShell>secret</AppShell>)
    expect(await screen.findByText('secret')).toBeInTheDocument()
  })
})
