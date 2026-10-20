import { useEffect, useState } from 'react';
import { api } from '../services';
import { go } from '../router';
import { ErrorText, SHAPES, COLORS, usePoll, useNow } from '../components/ui';
import { isPin, validNickname } from '../lib/validation';
import { secondsLeft } from '../lib/time';
import type { Option } from '../types';

const KEY = (g: number) => `qa_player_${g}`;
export const savedPlayer = (gameId: number) => { try { return JSON.parse(sessionStorage.getItem(KEY(gameId)) || 'null') as { playerToken: string; nickname: string } | null; } catch { return null; } };

export function JoinPage({ pin: initialPin }: { pin?: string }) {
  const [pin, setPin] = useState(initialPin ?? ''); const [nick, setNick] = useState('');
  const [quizTitle, setTitle] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { setTitle(null); if (isPin(pin)) api.findGame(pin).then((g) => setTitle(g.quizTitle), () => {}); }, [pin]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setErr(null);
    if (!isPin(pin)) return setErr('A game PIN has 6 digits');
    const n = validNickname(nick); if (n) return setErr(n);
    setBusy(true);
    try { const r = await api.join(pin, nick); sessionStorage.setItem(KEY(r.gameId), JSON.stringify(r)); go(`#/play/${r.gameId}`); }
    catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  return <div className="game phone center-page"><form className="joinbox" onSubmit={submit} noValidate>
    <div className="logo">⚡ QuizArena</div>
    <input className="input big center" name="pin" inputMode="numeric" placeholder="Game PIN" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} aria-label="Game PIN" />
    {quizTitle && <div className="muted-light small center">Quiz: {quizTitle}</div>}
    <input className="input big center" name="nickname" placeholder="Nickname" maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} aria-label="Nickname" />
    <ErrorText msg={err} />
    <button className="btn primary big block" disabled={busy}>Enter</button>
    <a className="muted-light small center" href="#/login">I'm a teacher →</a>
  </form></div>;
}

export function PlayPage({ gameId }: { gameId: number }) {
  const me = savedPlayer(gameId);
  const { data: s, error, receivedAt } = usePoll(() => (me ? api.playerState(gameId, me.playerToken) : Promise.reject(new Error('Join the game first'))), 700, [gameId]);
  const now = useNow(); const [sent, setSent] = useState<{ index: number; option: Option } | null>(null); const [err, setErr] = useState<string | null>(null);
  if (!me) { go('#/join'); return null; }
  if (!s) return <div className="game phone center-page"><ErrorText msg={error} />{!error && 'Connecting…'}</div>;
  const g = s.game;
  const answer = async (o: Option) => {
    if (!s.question || sent?.index === s.question.index) return;
    setSent({ index: s.question.index, option: o }); setErr(null);
    try { await api.answer(gameId, me.playerToken, s.question.index, o); } catch (e) { setErr((e as Error).message); }
  };
  const answered = s.answered || sent?.index === s.question?.index;
  const head = <div className="phone-top"><span>{s.nickname}</span><span data-testid="score">{s.score} pts</span></div>;
  if (g.status === 'lobby') return <div className="game phone">{head}<div className="phone-msg"><div className="big-emoji">🎮</div><h2>You're in!</h2><p>See your nickname on the screen? Get ready…</p></div></div>;
  if (g.status === 'finished') return <div className="game phone">{head}<div className="phone-msg"><div className="big-emoji">{s.rank === 1 ? '🏆' : s.rank && s.rank <= 3 ? '🥈' : '🎉'}</div><h2>You finished #{s.rank} of {s.playerCount}</h2><p>{s.score} points</p></div></div>;
  if (g.status === 'reveal' && s.lastResult) return <div className={`game phone ${s.lastResult.correct ? 'ok' : 'bad'}`}>{head}<div className="phone-msg">
    <div className="big-emoji">{s.lastResult.correct ? '✅' : s.answered ? '❌' : '⏰'}</div>
    <h2>{s.lastResult.correct ? `Correct! +${s.lastResult.points}` : s.answered ? 'Wrong answer' : "Time's up"}</h2>
    <p>Right answer: <span className={`shape-chip ${COLORS[s.lastResult.correctOption]}`}>{SHAPES[s.lastResult.correctOption]}</span></p><p>You are #{s.rank} of {s.playerCount}</p></div></div>;
  const left = s.question ? secondsLeft(g.questionStartedAt, s.question.timeLimit, g.serverNow, receivedAt, now) : 0;
  return <div className="game phone">{head}
    <div className="phone-q"><span>Q{(s.question?.index ?? 0) + 1}/{g.totalQuestions}</span><span className="timer sm" data-testid="ptimer">{left}</span></div>
    {answered ? <div className="phone-msg"><div className="big-emoji">⏳</div><h2>Answer locked in</h2><p>Look at the big screen…</p></div>
      : <div className="pad">{[0, 1, 2, 3].map((i) => <button key={i} className={`padbtn ${COLORS[i]}`} onClick={() => answer(i as Option)} aria-label={`Answer ${i + 1}`} disabled={left === 0}>{SHAPES[i]}</button>)}</div>}
    <ErrorText msg={err} />
  </div>;
}
