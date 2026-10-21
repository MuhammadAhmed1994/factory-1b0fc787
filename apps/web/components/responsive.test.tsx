import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { AuthForm } from './auth-form'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), usePathname: () => '/' }))

const css = readFileSync(join(__dirname, '../app/globals.css'), 'utf8')

describe('AC-24 small-viewport layout (360px)', () => {
  it('AC-24 prevents horizontal scrolling and adapts navigation below 768px', () => {
    expect(css).toMatch(/overflow-x:\s*hidden/)
    expect(css).toMatch(/@media \(max-width: 767px\)/)
    // list rows stack as cards on mobile; the table-like grid applies only from 768px up
    expect(css).toMatch(/@media \(min-width: 768px\)[\s\S]*grid-template-columns: 110px/)
    // auth card fits 360px minus margins
    expect(css).toMatch(/\.auth-card[^}]*width: calc\(100% - 32px\)/)
    // inputs are at least 44px tall and 16px to avoid zoom
    expect(css).toMatch(/min-height: 44px/)
  })

  it('AC-24 login and register actions are reachable', () => {
    const { unmount } = render(<AuthForm mode="login" />)
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument()
    unmount()
    render(<AuthForm mode="register" />)
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
  })
})
