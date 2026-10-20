import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './services';
import { auth } from './services/api';
import { parseRoute, TEACHER_ROUTES, go, type Route } from './router';
import { AuthPage } from './pages/auth';
import { QuizList, QuizEditor } from './pages/quizzes';
import { HostPage } from './pages/host';
import { JoinPage, PlayPage } from './pages/player';
import { GamesPage, ReportPage } from './pages/reports';
import type { User } from './types';

function useRoute(): Route { const [r, setR] = useState(parseRoute(location.hash)); useEffect(() => { const f = () => setR(parseRoute(location.hash)); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []); return r; }

function App() {
  const route = useRoute();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => { if (!auth.token) setUser(null); else api.me().then(setUser, () => { auth.set(null); setUser(null); }); }, []);
  if (user === undefined) return null;
  if (TEACHER_ROUTES.has(route.name) && !user) { go('#/login'); return null; }
  if ((route.name === 'login' || route.name === 'register') && user) { go('#/quizzes'); return null; }
  const logout = async () => { await api.logout().catch(() => {}); auth.set(null); setUser(null); go('#/'); };
  const onAuth = (u: User) => { setUser(u); go('#/quizzes'); };

  switch (route.name) {
    case 'home': return <Home user={user} />;
    case 'join': return <JoinPage pin={route.pin} />;
    case 'play': return <PlayPage gameId={route.gameId} />;
    case 'host': return <HostPage gameId={route.gameId} />;
    case 'login': case 'register': return <AuthPage mode={route.name} onAuth={onAuth} />;
  }
  return <div className="app">
    <header className="topbar"><a className="brand" href="#/quizzes">⚡ QuizArena</a>
      <nav><a className={route.name === 'games' || route.name === 'report' ? '' : 'active'} href="#/quizzes">Quizzes</a><a className={route.name === 'games' || route.name === 'report' ? 'active' : ''} href="#/games">History</a></nav>
      <span className="grow" /><span className="muted small">{user?.name}</span><button className="btn sm" onClick={logout}>Log out</button></header>
    <main className="container">
      {route.name === 'quizzes' && <QuizList />}
      {route.name === 'newQuiz' && <QuizEditor />}
      {route.name === 'editQuiz' && <QuizEditor id={route.id} />}
      {route.name === 'games' && <GamesPage />}
      {route.name === 'report' && <ReportPage gameId={route.gameId} />}
    </main></div>;
}

function Home({ user }: { user: User | null }) {
  return <div className="game hero"><div className="hero-inner">
    <div className="logo big">⚡ QuizArena</div><p className="tagline">Live quiz battles for your classroom. Students play from their phones — no accounts.</p>
    <div className="row center"><a className="btn primary big" href="#/join">Join a game</a><a className="btn light big" href={user ? '#/quizzes' : '#/login'}>I'm a teacher</a></div>
  </div></div>;
}

createRoot(document.getElementById('root')!).render(<App />);
