import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authLogin, googleSignIn } from '../services/api';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authLogin({ email: email.trim(), password });
      onLogin();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full rounded-[32px] border border-slate-800 bg-slate-900/95 p-10 shadow-soft">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Syncademy</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Secure access for low-connectivity schools</h1>
          <p className="mt-3 text-slate-400">Login with your school email and password to continue.</p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          {error && <div className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
          <button
            disabled={loading}
            className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="mt-4">
          <button
            onClick={async () => {
              setError('');
              setLoading(true);
              try {
                await googleSignIn();
                onLogin();
                navigate('/dashboard');
              } catch (err: any) {
                setError(err?.message || 'Google sign-in failed.');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full rounded-2xl border border-slate-800 bg-white/10 px-5 py-3 text-base font-semibold text-white hover:border-indigo-500 hover:bg-slate-900/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            to="/register-school"
            className="block rounded-2xl border border-slate-800 bg-slate-900/90 px-5 py-4 text-center text-sm font-medium text-slate-200 hover:border-indigo-500"
          >
            Register School Admin
          </Link>
          <Link
            to="/register-student"
            className="block rounded-2xl border border-slate-800 bg-slate-900/90 px-5 py-4 text-center text-sm font-medium text-slate-200 hover:border-indigo-500"
          >
            Register Student
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
