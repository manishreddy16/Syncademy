import { useEffect, useState } from 'react';
import { fetchDashboard, fetchPendingStudents, approveStudent } from '../services/api';

interface DashboardPageProps {
  user: { uid: string; role: string; name: string; schoolId: string; email: string };
}

const DashboardPage = ({ user }: DashboardPageProps) => {
  const [stats, setStats] = useState<{ approvedStudents: number; pendingStudents: number; dueAssignments: number; pendingPayments: number } | null>(null);
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const dashboardData = await fetchDashboard(user);
        setStats(dashboardData);
        if (user.role === 'admin') {
          const pending = await fetchPendingStudents(user);
          setPendingStudents(pending);
        }
      } catch (err) {
        setError('Unable to load dashboard data.');
      }
    };
    load();
  }, [user]);

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Overview for {user.role === 'admin' ? 'School Admin' : 'Student'}</h2>
            <p className="mt-2 max-w-2xl text-slate-400">Access school metrics, assignments, resources, and fees from one clean workspace.</p>
          </div>
          <div className="rounded-3xl bg-slate-950/80 px-6 py-4 text-slate-200 shadow-soft">
            <p className="text-sm text-slate-400">Connectivity status</p>
            <p className="mt-2 text-xl font-semibold text-white">{navigator.onLine ? 'Online' : 'Offline'}</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-3xl bg-rose-500/10 p-6 text-sm text-rose-200">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card">
          <h3 className="text-lg font-semibold text-white">School Info</h3>
          <div className="mt-5 space-y-3 text-slate-300">
            <p className="text-sm text-slate-400">Name</p>
            <p className="text-white">{user.name}</p>
            <p className="text-sm text-slate-400">School ID</p>
            <p className="text-white">{user.schoolId}</p>
            <p className="text-sm text-slate-400">Email</p>
            <p className="text-white">{user.email}</p>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-white">Top Metrics</h3>
          <div className="mt-6 grid gap-4">
            <div className="rounded-3xl bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Approved students</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stats?.approvedStudents ?? '--'}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Pending approvals</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stats?.pendingStudents ?? '--'}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-white">Action Items</h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-3xl bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Assignments available</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stats?.dueAssignments ?? '--'}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Payments pending</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stats?.pendingPayments ?? '--'}</p>
            </div>
          </div>
        </div>
      </div>

      {user.role === 'admin' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-soft">
          <h3 className="text-xl font-semibold text-white">Student Approval Requests</h3>
          <div className="mt-5 space-y-4">
            {pendingStudents.length === 0 ? (
              <p className="text-slate-400">No pending student approvals.</p>
            ) : (
              pendingStudents.map((student) => (
                <div key={student.id} className="flex flex-col gap-3 rounded-3xl bg-slate-950/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{student.name}</p>
                    <p className="text-sm text-slate-400">Roll No: {student.rollNo}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={async () => {
                        await approveStudent(student.id, true);
                        setPendingStudents((prev) => prev.filter((item) => item.id !== student.id));
                      }}
                      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        await approveStudent(student.id, false);
                        setPendingStudents((prev) => prev.filter((item) => item.id !== student.id));
                      }}
                      className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default DashboardPage;
