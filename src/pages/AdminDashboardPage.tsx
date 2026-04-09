import { useEffect, useState } from 'react';
import { getSchoolResources } from '../services/resources';
import { getSchoolAssignments, getSchoolSubmissions } from '../services/assignments';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';
import { fetchPendingStudents, approveStudent, fetchDashboard } from '../services/api';
import PendingTasksSection from '../components/PendingTasksSection';

interface AdminDashboardPageProps {
  user: any;
}

const AdminDashboardPage = ({ user }: AdminDashboardPageProps) => {
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  const loadData = async () => {
    try {
      const dashboardData = await fetchDashboard(user);
      setStudentCount(dashboardData.approvedStudents);

      const pending = await fetchPendingStudents(user);
      setPendingStudents(pending);

      const schoolResources = await getSchoolResources(user.schoolId);
      setResources(schoolResources);

      const schoolAssignments = await getSchoolAssignments(user.schoolId);
      setAssignments(schoolAssignments);

      const schoolSubmissions = await getSchoolSubmissions(user.schoolId);
      setRecentSubmissions(schoolSubmissions.slice(0, 5));
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSyncComplete = () => {
      loadData();
    };

    window.addEventListener('syncademy:sync-complete', handleSyncComplete);
    return () => window.removeEventListener('syncademy:sync-complete', handleSyncComplete);
  }, [user.schoolId]);

  const handleApproveStudent = async (studentId: string, approved: boolean) => {
    try {
      setLoading(true);
      await approveStudent(studentId, approved);
      
      // Reload pending students
      const pending = await fetchPendingStudents(user);
      setPendingStudents(pending);
    } catch (error) {
      console.error('Error approving student:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-slate-400">
              Welcome back, {user.name} | School: {user.schoolId}
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${
              isOnline ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
            }`}
          >
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-slate-400 text-sm font-medium">Total Students</p>
          <p className="text-3xl font-bold text-white mt-2">{studentCount}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-slate-400 text-sm font-medium">Pending Approvals</p>
          <p className="text-3xl font-bold text-white mt-2">{pendingStudents.length}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-slate-400 text-sm font-medium">Total Resources</p>
          <p className="text-3xl font-bold text-white mt-2">{resources.length}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-slate-400 text-sm font-medium">Assignments</p>
          <p className="text-3xl font-bold text-white mt-2">{assignments.length}</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Assignment Submissions</h2>
        {recentSubmissions.length === 0 ? (
          <p className="text-slate-400">No recent submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {recentSubmissions.map((submission) => (
              <div key={submission.id || submission.offlineKey} className="rounded-3xl bg-slate-950/80 p-4 border border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-white font-semibold">Assignment {submission.assignmentId}</p>
                    <p className="text-slate-400 text-sm mt-1">Student: {submission.studentName || submission.uid}</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Submitted {new Date(submission.submittedAt || Date.now()).toLocaleString()}
                    </p>
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Student Approvals */}
      {pendingStudents.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Pending Student Approvals</h2>
          <div className="space-y-3">
            {pendingStudents.map((student) => (
              <div key={student.id} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{student.name}</p>
                  <p className="text-slate-400 text-sm">{student.email} | Roll: {student.rollNo}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveStudent(student.id, true)}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-500 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproveStudent(student.id, false)}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      <PendingTasksSection user={user} />
    </div>
  );
};

export default AdminDashboardPage;
