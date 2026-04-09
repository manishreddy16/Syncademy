import { useEffect, useState } from 'react';
import { getAllPaymentHistory, bulkAddMoneyToStudents, getAllStudentBalances } from '../services/payment';
import { getSchoolResources } from '../services/resources';
import { getSchoolAssignments } from '../services/assignments';
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
  const [studentCount, setStudentCount] = useState(0);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [loading, setLoading] = useState(true);
  const [bulkAddAmount, setBulkAddAmount] = useState(1000);
  const [showBulkAddForm, setShowBulkAddForm] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  useEffect(() => {
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

        const studentBalances = await getAllStudentBalances(user.schoolId);
        setStudentCount(studentBalances.length);
      } catch (error) {
        console.error('Error loading admin dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user.schoolId]);

  const handleBulkAddMoney = async () => {
    try {
      setLoading(true);
      await bulkAddMoneyToStudents(user.schoolId, bulkAddAmount, `Bulk add: ${bulkAddAmount} units`);
      
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
              disabled={!isOnline || loading}
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
                disabled={loading || !isOnline}
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
