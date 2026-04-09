import { useEffect, useState } from 'react';
import {
  getAllStudentBalances,
  bulkAddMoneyToStudents,
  addMoneyToStudent,
  recordOfflineCredit,
  recordOfflineBulkCredit,
} from '../services/payment';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';
import { fetchPendingStudents, approveStudent } from '../services/api';

interface AdminStudentsPageProps {
  user: any;
}

const AdminStudentsPage = ({ user }: AdminStudentsPageProps) => {
  const [studentBalances, setStudentBalances] = useState<any[]>([]);
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [loading, setLoading] = useState(true);
  const [bulkAddAmount, setBulkAddAmount] = useState(1000);
  const [showBulkAddForm, setShowBulkAddForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [individualAmount, setIndividualAmount] = useState(0);
  const [individualDescription, setIndividualDescription] = useState('Add money');

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  const loadData = async () => {
    try {
      const balances = await getAllStudentBalances(user.schoolId);
      setStudentBalances(balances);
      const pending = await fetchPendingStudents(user);
      setPendingStudents(pending);
    } catch (error) {
      console.error('Error loading students:', error);
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
      loadData();
      setShowBulkAddForm(false);
      setBulkAddAmount(1000);
    } catch (error) {
      console.error('Error adding money:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoneyToStudent = async () => {
    if (!selectedStudentId || individualAmount <= 0) return;
    try {
      setLoading(true);
      if (isOnline) {
        await addMoneyToStudent(selectedStudentId, individualAmount, individualDescription);
      } else {
        await recordOfflineCredit(selectedStudentId, user.schoolId, individualAmount, individualDescription);
      }
      loadData();
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
      loadData();
    } catch (error) {
      console.error('Error approving student:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Students</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Manage Students & Balances</h2>
            <p className="mt-2 max-w-2xl text-slate-400">Approve new registrations, view balances, and manage student accounts.</p>
          </div>
          <div className={`rounded-3xl px-6 py-4 text-slate-200 shadow-soft ${isOnline ? 'bg-green-950/80' : 'bg-red-950/80'}`}>
            <p className="text-sm text-slate-400">Connectivity</p>
            <p className="mt-2 text-2xl font-semibold text-white">{isOnline ? '🟢 Online' : '🔴 Offline'}</p>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingStudents.length > 0 && (
        <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Pending Student Approvals</h3>
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

      {/* Bulk Add Money */}
      <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Bulk Balance Management</h3>
          {!showBulkAddForm && (
            <button
              onClick={() => setShowBulkAddForm(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-60"
              disabled={loading}
            >
              Add Money to All
            </button>
          )}
        </div>
        {showBulkAddForm && (
          <div className="mb-6 p-4 bg-slate-800/30 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Amount per student</label>
              <input
                type="number"
                value={bulkAddAmount}
                onChange={(e) => setBulkAddAmount(parseInt(e.target.value))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleBulkAddMoney}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-500 disabled:opacity-60"
              >
                Confirm
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

      {/* Individual Add Money */}
      <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Add Money to Individual Student</h3>
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
        <div className="mt-4">
          <button
            onClick={handleAddMoneyToStudent}
            disabled={loading || !selectedStudentId || individualAmount <= 0}
            className="rounded-2xl bg-green-600 px-5 py-3 text-white font-semibold hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Add Money'}
          </button>
        </div>
      </div>

      {/* Student Balances */}
      <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Student Balances</h3>
        {studentBalances.length === 0 ? (
          <p className="text-slate-400">No students yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {studentBalances.map((student) => (
              <div key={student.uid} className="rounded-3xl bg-slate-950/80 p-4 border border-slate-700">
                <p className="text-white font-semibold">{student.name}</p>
                <p className="text-slate-400 text-sm">{student.email}</p>
                <p className="mt-3 text-white font-semibold">₹{student.balance.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminStudentsPage;