import { useEffect, useState } from 'react';
import { api } from '../services';
import { go } from '../router';
import { ErrorText, Field, SHAPES, COLORS } from '../components/ui';
import { validateQuiz } from '../lib/validation';
import type { Question, QuizSummary, QuizInput, Option } from '../types';

export function QuizList() {
  const [list, setList] = useState<QuizSummary[] | null>(null); const [err, setErr] = useState<string | null>(null);
  const load = () => api.listQuizzes().then(setList, (e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const host = async (id: number) => { try { const g = await api.createGame(id); go(`#/host/${g.id}`); } catch (e) { setErr((e as Error).message); } };
  const del = async (q: QuizSummary) => { if (confirm(`Delete “${q.title}”?`)) { await api.deleteQuiz(q.id); load(); } };
  return <section className="stack">
    <div className="row spread"><h1>My quizzes</h1><a className="btn primary" href="#/quizzes/new">+ New quiz</a></div>
    <ErrorText msg={err} />
    {list && !list.length && <div className="card empty">No quizzes yet — create your first one.</div>}
    <div className="grid">{list?.map((q) => <div key={q.id} className="card quizcard">
      <h3>{q.title}</h3><p className="muted small">{q.description || '—'}</p>
      <p className="small">{q.questionCount} question{q.questionCount === 1 ? '' : 's'}</p>
      <div className="row"><button className="btn primary" onClick={() => host(q.id)} disabled={!q.questionCount}>▶ Host</button>
        <a className="btn" href={`#/quizzes/${q.id}/edit`}>Edit</a><button className="btn danger" onClick={() => del(q)}>Delete</button></div>
    </div>)}</div>
  </section>;
}

const blank = (): Question => ({ text: '', options: ['', '', '', ''], correct: 0, timeLimit: 20 });

export function QuizEditor({ id }: { id?: number }) {
  const [q, setQ] = useState<QuizInput>({ title: '', description: '', questions: [blank()] });
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (id) api.getQuiz(id).then((x) => setQ({ title: x.title, description: x.description, questions: x.questions }), (e) => setErr(e.message)); }, [id]);
  const setQuestion = (i: number, patch: Partial<Question>) => setQ({ ...q, questions: q.questions.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const move = (i: number, d: number) => { const a = [...q.questions]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setQ({ ...q, questions: a }); };
  const save = async () => {
    const v = validateQuiz(q); if (v) return setErr(v);
    setBusy(true); setErr(null);
    try { if (id) await api.updateQuiz(id, q); else await api.createQuiz(q); go('#/quizzes'); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return <section className="stack">
    <div className="row spread"><h1>{id ? 'Edit quiz' : 'New quiz'}</h1><div className="row"><a className="btn" href="#/quizzes">Cancel</a><button className="btn primary" onClick={save} disabled={busy}>Save quiz</button></div></div>
    <div className="card stack">
      <Field label="Title"><input className="input" name="title" value={q.title} maxLength={80} onChange={(e) => setQ({ ...q, title: e.target.value })} /></Field>
      <Field label="Description (optional)"><input className="input" name="description" value={q.description} maxLength={300} onChange={(e) => setQ({ ...q, description: e.target.value })} /></Field>
    </div>
    {q.questions.map((x, i) => <div key={i} className="card stack question-editor" data-q={i}>
      <div className="row spread"><strong>Question {i + 1}</strong><div className="row">
        <button className="btn sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
        <button className="btn sm" onClick={() => move(i, 1)} disabled={i === q.questions.length - 1} aria-label="Move down">↓</button>
        <select className="input sm" value={x.timeLimit} aria-label="Time limit" onChange={(e) => setQuestion(i, { timeLimit: Number(e.target.value) as Question['timeLimit'] })}>{[10, 20, 30].map((t) => <option key={t} value={t}>{t} s</option>)}</select>
        <button className="btn sm danger" onClick={() => setQ({ ...q, questions: q.questions.filter((_, j) => j !== i) })} disabled={q.questions.length === 1} aria-label="Delete question">✕</button></div></div>
      <input className="input" placeholder="Question text" value={x.text} maxLength={200} aria-label={`Question ${i + 1} text`} onChange={(e) => setQuestion(i, { text: e.target.value })} />
      <div className="answers-edit">{x.options.map((o, k) => <label key={k} className={`answer-edit ${COLORS[k]} ${x.correct === k ? 'correct' : ''}`}>
        <span className="shape">{SHAPES[k]}</span>
        <input className="input" placeholder={`Answer ${k + 1}`} value={o} maxLength={80} aria-label={`Question ${i + 1} answer ${k + 1}`}
          onChange={(e) => { const opts = [...x.options] as Question['options']; opts[k] = e.target.value; setQuestion(i, { options: opts }); }} />
        <input type="radio" name={`correct-${i}`} checked={x.correct === k} onChange={() => setQuestion(i, { correct: k as Option })} aria-label={`Answer ${k + 1} is correct`} />
      </label>)}</div>
    </div>)}
    <button className="btn block" onClick={() => setQ({ ...q, questions: [...q.questions, blank()] })} disabled={q.questions.length >= 50}>+ Add question</button>
    <ErrorText msg={err} />
  </section>;
}
