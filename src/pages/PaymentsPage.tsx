import { useEffect, useState } from 'react';
import { getUserBalance, deductMoney, recordOfflinePayment, getUserTransactions } from '../services/payment';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';
import { getCurrentUser, isAdminUser } from '../utils/auth';

interface PaymentsPageProps {
  user: any;
}

const PaymentsPage = ({ user }: PaymentsPageProps) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

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
        setTransactions(userTransactions);
      } catch (error) {
        console.error('Error loading payment data:', error);
        setFeedback({ type: 'error', message: 'Unable to load payment data' });
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user.uid]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    setLoading(true);

    try {
      const paymentAmount = parseInt(amount);

      if (paymentAmount <= 0) {
        setFeedback({ type: 'error', message: 'Amount must be greater than 0' });
        return;
      }

      if (paymentAmount > balance) {
        setFeedback({ type: 'error', message: 'Insufficient balance' });
        return;
      }

      if (isOnline) {
        await deductMoney(user.uid, paymentAmount, description || 'Payment');
        setFeedback({ type: 'success', message: 'Payment successful!' });
      } else {
        await recordOfflinePayment(user.uid, paymentAmount, description || 'Payment (Offline)');
        setFeedback({ type: 'success', message: 'Payment recorded offline. Will sync when online.' });
      }

      setAmount('');
      setDescription('');

      // Reload data
      const userBalance = await getUserBalance(user.uid);
      setBalance(userBalance);

      const userTransactions = await getUserTransactions(user.uid);
      setTransactions(userTransactions);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'Payment failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-slate-500">💳 Payments</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Manage your payments</h2>
          </div>
          <div className="rounded-3xl bg-slate-950/80 px-6 py-4 text-slate-200 shadow-soft">
            <p className="text-sm text-slate-400">Available Balance</p>
            <p className="mt-2 text-2xl font-semibold text-indigo-400">{balance.toLocaleString()} units</p>
            <p className={`text-xs mt-1 ${isOnline ? 'text-green-400' : 'text-amber-400'}`}>
              {isOnline ? '🟢 Online' : '🔴 Offline Mode'}
            </p>
          </div>
        </div>
      </div>

      {!isAdminUser() && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
            <h3 className="text-xl font-semibold text-white">💰 Make Payment</h3>
            <form className="mt-5 space-y-4" onSubmit={handlePayment}>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  min="1"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. School fee, Activity fee"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !amount}
                className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-white font-semibold hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Pay Now'}
              </button>

              {feedback.message && (
                <div
                  className={`p-4 rounded-2xl text-sm ${
                    feedback.type === 'success'
                      ? 'bg-green-900/20 text-green-200 border border-green-700'
                      : 'bg-red-900/20 text-red-200 border border-red-700'
                  }`}
                >
                  {feedback.message}
                </div>
              )}
            </form>
          </div>

          <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6">
            <h3 className="text-xl font-semibold text-white">📋 Payment Info</h3>
            <div className="mt-5 space-y-3 text-slate-400">
              <div>
                <p className="text-sm font-medium text-slate-300">Current Balance</p>
                <p className="text-lg font-semibold text-indigo-400 mt-1">{balance.toLocaleString()} units</p>
              </div>
              <div className="pt-3 border-t border-slate-700">
                <p className="text-xs">✅ Payments are processed securely in Firestore</p>
                <p className="text-xs mt-2">📱 Offline payments will sync automatically when online</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[24px] border border-slate-800 bg-slate-900/90 p-6 overflow-x-auto">
        <h3 className="text-xl font-semibold text-white mb-4">📊 Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-slate-400">No transactions yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-2 text-slate-400 font-medium">Type</th>
                <th className="text-left px-4 py-2 text-slate-400 font-medium">Amount</th>
                <th className="text-left px-4 py-2 text-slate-400 font-medium">Description</th>
                <th className="text-left px-4 py-2 text-slate-400 font-medium">Date</th>
                <th className="text-left px-4 py-2 text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx: any, idx: number) => (
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
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${tx.synced ? 'text-green-400' : 'text-amber-400'}`}>
                      {tx.synced ? '✓ Synced' : '⏳ Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default PaymentsPage;
