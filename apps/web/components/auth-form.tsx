'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { api, errorMessage, fieldErrors } from '@/lib/api'
import { Field } from './ui'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const isLogin = mode === 'login'

  async function submit(e: FormEvent) {
    e.preventDefault()
    const local: Record<string, string> = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) local.email = 'Enter a valid email address'
    if (!password) local.password = 'Password is required'
    else if (!isLogin && password.length < 8) local.password = 'Password must be at least 8 characters'
    setErrors(local)
    setFormError('')
    if (Object.keys(local).length) return
    setBusy(true)
    try {
      if (isLogin) await api.login(email.trim(), password)
      else {
        await api.register(email.trim(), password)
        await api.login(email.trim(), password)
      }
      router.push('/dashboard')
    } catch (err) {
      setErrors(fieldErrors(err))
      setFormError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <main className="auth-card">
      <h1>{isLogin ? 'Log in' : 'Create account'}</h1>
      <form onSubmit={submit} noValidate>
        {formError && (
          <p role="alert" className="alert alert-error">
            {formError}
          </p>
        )}
        <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email} />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {isLogin ? 'Log in' : 'Register'}
        </button>
      </form>
      <p className="muted">
        {isLogin ? (
          <>
            No account? <Link href="/register">Register</Link>
          </>
        ) : (
          <>
            Already registered? <Link href="/login">Log in</Link>
          </>
        )}
      </p>
    </main>
  )
}
