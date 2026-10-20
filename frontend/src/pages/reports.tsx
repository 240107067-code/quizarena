import { useEffect, useState } from 'react';
import { api } from '../services';
import { Bars, ErrorText } from '../components/ui';
import { reportCsv } from '../lib/csv';
import type { GameReport, GameSummary } from '../types';

export function GamesPage() {
  const [list, setList] = useState<GameSummary[] | null>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.listGames().then(setList, (e) => setErr(e.message)); }, []);
  return <section className="stack"><h1>Game history</h1><ErrorText msg={err} />
    {list && !list.length && <div className="card empty">No games yet — host a quiz to see reports here.</div>}
    {list && list.length > 0 && <div className="card"><table className="table"><thead><tr><th>Quiz</th><th>Date</th><th>Players</th><th>Winner</th><th /></tr></thead>
      <tbody>{list.map((g) => <tr key={g.id}><td>{g.quizTitle}</td><td>{new Date(g.createdAt).toLocaleString()}</td><td>{g.playerCount}</td>
        <td>{g.status === 'finished' ? (g.winner ?? '—') : <span className="badge">{g.status}</span>}</td>
        <td>{g.status === 'finished' ? <a href={`#/games/${g.id}`}>Report →</a> : <a href={`#/host/${g.id}`}>Resume →</a>}</td></tr>)}</tbody></table></div>}
  </section>;
}

export function ReportPage({ gameId }: { gameId: number }) {
  const [r, setR] = useState<GameReport | null>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.report(gameId).then(setR, (e) => setErr(e.message)); }, [gameId]);
  if (!r) return <ErrorText msg={err} />;
  const download = () => {
    const blob = new Blob([reportCsv(r)], { type: 'text/csv' }); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `quizarena-${r.game.pin}-results.csv`; a.click();
  };
  return <section className="stack">
    <div className="row spread"><div><h1>{r.game.quizTitle}</h1><p className="muted">{new Date(r.game.createdAt).toLocaleString()} · {r.game.playerCount} players · PIN {r.game.pin}</p></div>
      <button className="btn" onClick={download}>⬇ Export CSV</button></div>
    <div className="card"><h3>Final leaderboard</h3><table className="table"><thead><tr><th>#</th><th>Nickname</th><th>Score</th><th>Correct</th></tr></thead>
      <tbody>{r.leaderboard.map((p) => <tr key={p.playerId}><td>{p.rank}</td><td>{p.nickname}</td><td>{p.score}</td><td>{p.correctCount}/{r.questions.length}</td></tr>)}</tbody></table></div>
    <h2>Questions</h2>
    {r.questions.map((q) => <div key={q.index} className="card stack"><div className="row spread"><strong>Q{q.index + 1}. {q.text}</strong>
      <span className={`badge ${q.percentCorrect < 50 ? 'warn' : 'ok'}`}>{q.percentCorrect}% correct</span></div>
      <Bars distribution={q.distribution} correct={q.correct} options={q.options} />
      <p className="muted small">{q.options.map((o, i) => `${['▲', '◆', '●', '■'][i]} ${o}`).join(' · ')}{q.noAnswer ? ` · ${q.noAnswer} no answer` : ''}</p></div>)}
  </section>;
}
