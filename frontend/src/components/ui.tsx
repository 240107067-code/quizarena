import { useEffect, useRef, useState } from 'react';
export const SHAPES = ['▲', '◆', '●', '■'];
export const COLORS = ['red', 'blue', 'yellow', 'green'];

export function usePoll<T>(load: () => Promise<T>, ms = 700, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const loadRef = useRef(load); loadRef.current = load;
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try { const d = await loadRef.current(); if (alive) { setData(d); setError(null); setReceivedAt(Date.now()); } }
      catch (e) { if (alive) setError((e as Error).message); }
    };
    tick(); const t = setInterval(tick, ms);
    return () => { alive = false; clearInterval(t); };
  }, deps); // eslint-disable-line
  return { data, error, receivedAt, setData };
}

export function useNow(ms = 250) { const [n, setN] = useState(Date.now()); useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]); return n; }

export function ErrorText({ msg }: { msg: string | null }) { return msg ? <p className="error" role="alert">{msg}</p> : null; }

export function Field(p: { label: string; children: React.ReactNode }) { return <label className="field"><span>{p.label}</span>{p.children}</label>; }

export function Bars({ distribution, correct, options }: { distribution: number[]; correct: number | null; options: string[] }) {
  const max = Math.max(1, ...distribution);
  return <div className="bars">{distribution.map((n, i) => (
    <div key={i} className={`barcol ${COLORS[i]} ${correct !== null && correct !== i ? 'faded' : ''}`}>
      <div className="barcount">{n}{correct === i ? ' ✓' : ''}</div>
      <div className="barfill" style={{ height: `${(n / max) * 100}%` }} />
      <div className="barlabel" title={options[i]}>{SHAPES[i]}</div>
    </div>))}</div>;
}
