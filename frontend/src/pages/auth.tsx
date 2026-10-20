import { useState } from 'react';
import { api } from '../services';
import { auth } from '../services/api';
import { ErrorText, Field } from '../components/ui';
import type { User } from '../types';

export function AuthPage({ mode, onAuth }: { mode: 'login' | 'register'; onAuth: (u: User) => void }) {
  const [f, setF] = useState({ email: '', password: '', name: '' });
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setBusy(true); setErr(null);
    try {
      const r = mode === 'login' ? await api.login(f.email, f.password) : await api.register(f.email, f.password, f.name);
      auth.set(r.token); onAuth(r.user);
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  return <div className="center-page"><form className="card auth" onSubmit={submit} noValidate>
    <h1>{mode === 'login' ? 'Teacher login' : 'Create a teacher account'}</h1>
    {mode === 'register' && <Field label="Your name"><input className="input" name="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={40} /></Field>}
    <Field label="Email"><input className="input" name="email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
    <Field label="Password"><input className="input" name="password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
    <ErrorText msg={err} />
    <button className="btn primary block" disabled={busy}>{mode === 'login' ? 'Log in' : 'Create account'}</button>
    <p className="muted small">{mode === 'login' ? <>No account? <a href="#/register">Register</a> · Demo: demo@quizarena.kz / demo1234</> : <>Have an account? <a href="#/login">Log in</a></>}</p>
  </form></div>;
}
