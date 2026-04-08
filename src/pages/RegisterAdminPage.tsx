import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchool } from '../services/api';

const RegisterAdminPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [schoolId, setSchoolId] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await registerSchool({ email: email.trim(), name, location, password });
      setSchoolId(response.schoolId);
      setSuccess(`School registered successfully! Your School ID is ${response.schoolId}.`);
      setEmail('');
      setName('');
      setLocation('');
      setPassword('');
      setTimeout(() => navigate('/login'), 3500);
    } catch (err: any) {
      setError(err?.message || 'Could not register school. Please try again.');
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-12">
      <div className="w-full rounded-[32px] border border-slate-800 bg-slate-900/95 p-10 shadow-soft">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">School admin onboarding</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Register your school for Syncademy</h1>
          <p className="mt-3 text-slate-400">Create your admin account and generate a unique School ID for students.</p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">School Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-2xl border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full rounded-2xl border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>
          {error && <div className="rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
          {success && <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-200">{success}</div>}
          <button type="submit" className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white hover:bg-indigo-500">
            Register School
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Already registered? <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterAdminPage;
