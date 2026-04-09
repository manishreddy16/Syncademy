import { useEffect, useState } from 'react';
import {
  getAllPaymentHistory,
  bulkAddMoneyToStudents,
  getAllStudentBalances,
  addMoneyToStudent,
  recordOfflineCredit,
  recordOfflineBulkCredit,
} from '../services/payment';
import { getSchoolResources } from '../services/resources';
import { getSchoolAssignments, getSchoolSubmissions } from '../services/assignments';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';
import { fetchPendingStudents, approveStudent } from '../services/api';
import PendingTasksSection from '../components/PendingTasksSection';

interface AdminDashboardPageProps {
  user: any;
}

const AdminDashboardPage = ({ user }: AdminDashboardPageProps) => {
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [studentBalances, setStudentBalances] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [individualAmount, setIndividualAmount] = useState(0);
  const [individualDescription, setIndividualDescription] = useState('Add money');
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [loading, setLoading] = useState(true);
  const [bulkAddAmount, setBulkAddAmount] = useState(1000);
  const [showBulkAddForm, setShowBulkAddForm] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  const loadData = async () => {
    try {
      const history = await getAllPaymentHistory(user.schoolId);
      setPaymentHistory(history);

      const pending = await fetchPendingStudents(user);
      setPendingStudents(pending);

      const schoolResources = await getSchoolResources(user.schoolId);
      setResources(schoolResources);

      const schoolAssignments = await getSchoolAssignments(user.schoolId);
      setAssignments(schoolAssignments);

      const studentList = await getAllStudentBalances(user.schoolId);
      setStudentBalances(studentList);
      setStudentCount(studentList.length);

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

  const handleBulkAddMoney = async () => {
    try {
      setLoading(true);
      if (isOnline) {
        await bulkAddMoneyToStudents(user.schoolId, bulkAddAmount, `Bulk add: ${bulkAddAmount} units`);
      } else {
        await recordOfflineBulkCredit(user.schoolId, bulkAddAmount, `Bulk add: ${bulkAddAmount} units`);
      }

      // Reload payment history
      const history = await getAllPaymentHistory(user.schoolId);
      setPaymentHistory(history);
      
      setShowBulkAddForm(false);
      setBulkAddAmount(1000);
    } catch (error) {
      console.error('Error adding money:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoneyToStudent = async () => {
    if (!selectedStudentId || individualAmount <= 0) {
      return;
    }

    try {
      setLoading(true);
      if (isOnline) {
        await addMoneyToStudent(selectedStudentId, individualAmount, individualDescription);
      } else {
        await recordOfflineCredit(selectedStudentId, user.schoolId, individualAmount, individualDescription);
      }

      const history = await getAllPaymentHistory(user.schoolId);
      setPaymentHistory(history);

      const studentList = await getAllStudentBalances(user.schoolId);
      setStudentBalances(studentList);
      setStudentCount(studentList.length);

      setSelectedStudentId('');
      setIndividualAmount(0);
      setIndividualDescription('Add money');
    } catch (error) {
      console.error('Error adding money to student:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="text-xl font-semibold text-white mb-4">Student Balance Overview</h2>
        {studentBalances.length === 0 ? (
          <p className="text-slate-400">No student data available yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {studentBalances.slice(0, 8).map((student) => (
              <div key={student.uid} className="rounded-3xl bg-slate-950/80 p-4 border border-slate-700">
                <p className="text-white font-semibold">{student.name}</p>
                <p className="text-slate-400 text-sm">{student.email}</p>
                <p className="mt-3 text-white font-semibold">₹{student.balance.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
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

      {/* Bulk Add Money Section */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Student Balance Management</h2>
          {!showBulkAddForm && (
            <button
              onClick={() => setShowBulkAddForm(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Add Money to All
            </button>
          )}
        </div>

        {showBulkAddForm && (
          <div className="mb-6 p-4 bg-slate-800/30 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Amount per student
              </label>
              <input
                type="number"
                value={bulkAddAmount}
                onChange={(e) => setBulkAddAmount(parseInt(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleBulkAddMoney}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-500 disabled:opacity-60"
              >
                {loading ? 'Adding...' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowBulkAddForm(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 font-medium hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Add Money to Individual Student</h2>
            <p className="text-slate-400 text-sm">Choose a student and top up their balance.</p>
          </div>
          <span className="text-sm text-slate-500">{isOnline ? 'Online' : 'Offline queued'}</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Select student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
            >
              <option value="">Choose a student</option>
              {studentBalances.map((student) => (
                <option key={student.uid} value={student.uid}>
                  {student.name} ({student.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Amount</label>
            <input
              type="number"
              value={individualAmount}
              onChange={(e) => setIndividualAmount(parseInt(e.target.value))}
              placeholder="Amount"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <input
              type="text"
              value={individualDescription}
              onChange={(e) => setIndividualDescription(e.target.value)}
              placeholder="e.g. Bonus credit"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAddMoneyToStudent}
            disabled={loading || !selectedStudentId || individualAmount <= 0}
            className="rounded-2xl bg-green-600 px-5 py-3 text-white font-semibold hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Add Money'}
          </button>
          <p className="text-sm text-slate-400 leading-relaxed">
            Admin actions are queued locally while offline and will sync once connectivity returns.
          </p>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 overflow-x-auto">
        <h2 className="text-xl font-semibold text-white mb-4">Payment History</h2>
        {paymentHistory.length === 0 ? (
          <p className="text-slate-400">No payment history yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Student</th>
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Type</th>
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Amount</th>
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Description</th>
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((tx, idx) => (
                <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">{tx.name}</p>
                      <p className="text-slate-400 text-xs">{tx.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        tx.type === 'credit' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {tx.type === 'credit' ? '+ Credit' : '- Debit'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{tx.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-300">{tx.description}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending Tasks */}
      <PendingTasksSection user={user} />
    </div>
  );
};

export default AdminDashboardPage;
