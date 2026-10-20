import { useEffect, useRef, useState } from 'react';
import { api } from '../services';
import { Bars, SHAPES, COLORS, usePoll, useNow, ErrorText } from '../components/ui';
import { secondsLeft } from '../lib/time';
import type { HostState } from '../types';

export const joinUrl = (pin: string) => `${location.origin}${location.pathname}#/join/${pin}`;
export const qrSrc = (url: string) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(url)}`;

export function HostPage({ gameId }: { gameId: number }) {
  const { data: s, error, receivedAt, setData } = usePoll(() => api.hostState(gameId), 700, [gameId]);
  const now = useNow();
  const act = (fn: (id: number) => Promise<HostState>) => fn(gameId).then(setData, (e) => alert(e.message));
  const left = s?.question ? secondsLeft(s.game.questionStartedAt, s.question.timeLimit, s.game.serverNow, receivedAt, now) : 0;
  const revealing = useRef(false);
  // Auto-reveal when time is up or everyone answered.
  useEffect(() => {
    if (!s || s.game.status !== 'question' || revealing.current) return;
    if (left === 0 || (s.players.length > 0 && s.answeredCount >= s.players.length)) {
      revealing.current = true; api.reveal(gameId).then(setData).catch(() => {}).finally(() => { revealing.current = false; });
    }
  }, [s, left]);
  if (!s) return <div className="game center-page"><ErrorText msg={error} />{!error && 'Loading…'}</div>;
  const g = s.game;
  return <div className="game">
    <div className="game-top"><span>⚡ QuizArena · {g.quizTitle}</span><span>{g.status !== 'lobby' && g.status !== 'finished' ? `Question ${g.currentIndex + 1} / ${g.totalQuestions}` : `PIN ${g.pin}`}</span></div>
    {g.status === 'lobby' && <div className="lobby">
      <div className="lobby-join"><div className="muted-light">Join at <b>{location.host}</b> with PIN</div><div className="pin" data-testid="pin">{g.pin}</div>
        <div className="joinurl">{joinUrl(g.pin)}</div></div>
      <QrCode url={joinUrl(g.pin)} />
      <div className="lobby-players"><div className="row spread"><h2>{s.players.length} player{s.players.length === 1 ? '' : 's'}</h2>
        <button className="btn primary big" onClick={() => act(api.startGame)} disabled={!s.players.length}>Start ▶</button></div>
        <div className="chips">{s.players.map((p) => <span className="chip" key={p.id}>{p.nickname}</span>)}{!s.players.length && <span className="muted-light">Waiting for players…</span>}</div></div>
    </div>}
    {(g.status === 'question' || g.status === 'reveal') && s.question && <div className="stage">
      <div className="qcard">{s.question.text}</div>
      <div className="row spread stage-info">
        <div className={`timer ${left <= 5 && g.status === 'question' ? 'hurry' : ''}`} data-testid="timer">{g.status === 'question' ? left : '✓'}</div>
        {g.status === 'reveal' ? <Bars distribution={s.distribution!} correct={s.question.correct} options={s.question.options} /> : <div className="answered"><b data-testid="answered">{s.answeredCount}</b><span>answers</span></div>}
        {g.status === 'question' ? <button className="btn light" onClick={() => act(api.reveal)}>Skip ⏭</button> : <button className="btn primary big" onClick={() => act(api.next)}>{g.currentIndex + 1 < g.totalQuestions ? 'Next ▶' : 'Results 🏆'}</button>}
      </div>
      <div className="tiles">{s.question.options.map((o, i) => <div key={i} className={`tile ${COLORS[i]} ${s.question!.correct !== null && s.question!.correct !== i ? 'faded' : ''}`}><span className="shape">{SHAPES[i]}</span>{o}{s.question!.correct === i ? ' ✓' : ''}</div>)}</div>
      {g.status === 'reveal' && <Leaderboard s={s} />}
    </div>}
    {g.status === 'finished' && <Podium s={s} />}
  </div>;
}

/** The QR image comes from api.qrserver.com; offline classrooms get a clear hint instead of a broken image (#10). */
function QrCode({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="qr qr-missing" data-testid="qr-fallback">QR needs internet —<br />use the PIN or the link</div>;
  return <img className="qr" src={qrSrc(url)} alt="QR code to join" width={220} height={220} onError={() => setFailed(true)} />;
}

function Leaderboard({ s }: { s: HostState }) {
  return <div className="board"><h2>Leaderboard</h2><ol>{s.leaderboard.slice(0, 5).map((r) => <li key={r.playerId}><span className="rank">{r.rank}</span><span className="grow">{r.nickname}</span>{r.lastPoints > 0 && <span className="delta">+{r.lastPoints}</span>}<b>{r.score}</b></li>)}</ol></div>;
}

function Podium({ s }: { s: HostState }) {
  const top = s.leaderboard.slice(0, 3); const order = [top[1], top[0], top[2]];
  return <div className="podium-wrap"><h1>🏆 Final results</h1>
    <div className="podium">{order.map((r, i) => r ? <div key={r.playerId} className={`step step${[2, 1, 3][i]}`}><div className="pname">{r.nickname}</div><div className="pscore">{r.score}</div><div className="block">{r.rank}</div></div> : <div key={i} className="step empty" />)}</div>
    <div className="board"><ol>{s.leaderboard.map((r) => <li key={r.playerId}><span className="rank">{r.rank}</span><span className="grow">{r.nickname}</span><b>{r.score}</b></li>)}</ol></div>
    <div className="row center"><a className="btn light" href={`#/games/${s.game.id}`}>Open report</a><a className="btn light" href="#/quizzes">Back to quizzes</a></div>
  </div>;
}
