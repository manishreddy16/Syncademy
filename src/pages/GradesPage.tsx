import { useEffect, useState } from 'react';
import { getStudentSubmissions } from '../services/assignments';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';

interface GradesPageProps {
  user: any;
}

const GradesPage = ({ user }: GradesPageProps) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  const loadGrades = async () => {
    try {
      const studentSubmissions = await getStudentSubmissions(user.uid);
      setSubmissions(studentSubmissions);
    } catch (error) {
      console.error('Error loading grades:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrades();
    const handleSyncComplete = () => {
      loadGrades();
    };
    window.addEventListener('syncademy:sync-complete', handleSyncComplete);
    return () => window.removeEventListener('syncademy:sync-complete', handleSyncComplete);
  }, [user.uid]);

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Grades</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">My Grades & Assignment History</h2>
            <p className="mt-2 max-w-2xl text-slate-400">Review your submitted work, grade status, and file attachments without the distraction of the map view.</p>
          </div>
          <div className={`rounded-3xl px-6 py-4 text-slate-200 shadow-soft ${isOnline ? 'bg-green-950/80' : 'bg-red-950/80'}`}>
            <p className="text-sm text-slate-400">Connectivity</p>
            <p className="mt-2 text-2xl font-semibold text-white">{isOnline ? '🟢 Online' : '🔴 Offline'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <p className="text-sm text-slate-400">Total submissions</p>
          <p className="mt-3 text-3xl font-semibold text-white">{submissions.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <p className="text-sm text-slate-400">Graded</p>
          <p className="mt-3 text-3xl font-semibold text-green-300">{submissions.filter((item) => item.status === 'graded').length}</p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <p className="text-sm text-slate-400">Pending</p>
          <p className="mt-3 text-3xl font-semibold text-amber-300">{submissions.filter((item) => item.status !== 'graded').length}</p>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Assignment Grade Log</h3>
        {loading ? (
          <p className="text-slate-400">Loading grades...</p>
        ) : submissions.length === 0 ? (
          <p className="text-slate-400">You have not submitted any assignments yet.</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div key={submission.id || submission.offlineKey} className="rounded-3xl bg-slate-850/80 border border-slate-700 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-white font-semibold">Assignment {submission.assignmentId}</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Submitted on {new Date(submission.submittedAt || Date.now()).toLocaleString()}
                    </p>
                    {submission.fileName && (
                      <p className="text-slate-400 text-sm mt-1">File: {submission.fileName}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    submission.status === 'graded'
                      ? 'bg-emerald-900 text-emerald-200'
                      : submission.status === 'submitted'
                      ? 'bg-blue-900 text-blue-200'
                      : 'bg-amber-900 text-amber-200'
                  }`}>
                    {submission.status === 'graded' ? `Graded${submission.grade ? `: ${submission.grade}` : ''}` : submission.status === 'submitted' ? 'Submitted' : 'Pending'}
                  </span>
                </div>
                {submission.content && (
                  <p className="mt-3 text-slate-300 text-sm">{submission.content}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default GradesPage;
