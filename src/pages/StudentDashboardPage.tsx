import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { getUserBalance, getUserTransactions } from '../services/payment';
import { getStudentSubmissions } from '../services/assignments';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';
import PendingTasksSection from '../components/PendingTasksSection';

interface StudentDashboardPageProps {
  user: any;
}

const StudentDashboardPage = ({ user }: StudentDashboardPageProps) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<[number, number]>([6.9271, 79.8612]);
  const [locationStatus, setLocationStatus] = useState('Retrieving location...');

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userBalance = await getUserBalance(user.uid);
        setBalance(userBalance);

        const userTransactions = await getUserTransactions(user.uid);
        setTransactions(userTransactions.slice(0, 10)); // Last 10 transactions

        const userSubmissions = await getStudentSubmissions(user.uid);
        setSubmissions(userSubmissions);
      } catch (error) {
        console.error('Error loading student dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user.uid]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation([position.coords.latitude, position.coords.longitude]);
        setLocationStatus('Location loaded successfully');
      },
      () => {
        setLocationStatus('Unable to retrieve location. Showing default map.');
      },
      { timeout: 10000 }
    );
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome, {user.name}</h1>
            <p className="text-slate-400">Student Portal | Roll: {user.rollNo || 'N/A'}</p>
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

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-indigo-700 bg-indigo-950/40 p-6">
          <p className="text-indigo-400 text-sm font-medium">💰 Balance</p>
          <p className="text-3xl font-bold text-white mt-3">{balance.toLocaleString()} units</p>
          <p className="text-indigo-300 text-xs mt-2">Available for payments</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-slate-400 text-sm font-medium">submissions</p>
          <p className="text-3xl font-bold text-white mt-3">{submissions.length}</p>
          <p className="text-slate-400 text-xs mt-2">Total assignments submitted</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <p className="text-slate-400 text-sm font-medium">⭐ Status</p>
          <p className="text-3xl font-bold text-white mt-3">{'Active'}</p>
          <p className="text-slate-400 text-xs mt-2">Approved and active</p>
        </div>
      </div>

      {/* Pending Tasks */}
      <PendingTasksSection user={user} />

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Current Location</h2>
            <p className="text-sm text-slate-400">{locationStatus}</p>
          </div>
          <span className="text-sm text-slate-300">Live map preview</span>
        </div>
        <div className="h-72 w-full overflow-hidden rounded-3xl border border-slate-800">
          <MapContainer center={location} zoom={12} className="h-full w-full">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <Marker position={location}>
              <Popup>Your current location</Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 overflow-x-auto">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-slate-400">No transactions yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Type</th>
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Amount</th>
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Description</th>
                <th className="px-4 py-2 text-left text-slate-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
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

      {/* Recent Submissions */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Submissions</h2>
        {submissions.length === 0 ? (
          <p className="text-slate-400">No submissions yet</p>
        ) : (
          <div className="space-y-3">
            {submissions.slice(0, 5).map((submission) => (
              <div key={submission.id} className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Assignment {submission.assignmentId}</p>
                    <p className="text-slate-400 text-sm">
                      Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      submission.status === 'graded'
                        ? 'bg-green-900 text-green-200'
                        : submission.status === 'submitted'
                        ? 'bg-blue-900 text-blue-200'
                        : 'bg-yellow-900 text-yellow-200'
                    }`}
                  >
                    {submission.status || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboardPage;
