import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { registerStudent } from '../services/api';

const RegisterStudentPage = () => {
  const [email, setEmail] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('');
    try {
      await registerStudent({
        email: email.trim(),
        schoolId: schoolId.trim().toUpperCase(),
        name,
        rollNo,
        password,
      });
      setStatus('Student registration request submitted successfully. Your account is pending admin approval. You will be able to login once approved.');
      setEmail('');
      setSchoolId('');
      setName('');
      setRollNo('');
      setPassword('');
    } catch (err: any) {
      setError(err?.message || 'Could not register student. Verify your School ID.');
      console.error('Student registration error:', err);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-12">
      <div className="w-full rounded-[32px] border border-slate-800 bg-slate-900/95 p-10 shadow-soft">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Student registration</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Join your school on Syncademy</h1>
          <p className="mt-3 text-slate-400">Enter your School ID to register and start learning.</p>
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
            <label className="mb-2 block text-sm font-medium text-slate-300">School ID</label>
            <input
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              required
              className="w-full rounded-2xl border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Student Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-2xl border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Roll Number</label>
            <input
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
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
          {status && <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-200">{status}</div>}
          <button type="submit" className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white hover:bg-indigo-500">
            Register Student
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Already registered? <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterStudentPage;
