import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';
import { getUserBalance } from '../services/payment';

interface SidebarProps {
  user: { role: string; name: string; schoolId?: string | number; uid?: string };
  items: Array<{ label: string; path: string }>;
  onLogout: () => void;
}

const Sidebar = ({ user, items, onLogout }: SidebarProps) => {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [balance, setBalance] = useState(0);
  const [showBalance, setShowBalance] = useState(user.role === 'student');

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (showBalance && user.uid) {
      const loadBalance = async () => {
        try {
          const userBalance = await getUserBalance(user.uid!);
          setBalance(userBalance);
        } catch (error) {
          console.error('Error loading balance:', error);
        }
      };

      loadBalance();
      const interval = setInterval(loadBalance, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [showBalance, user.uid]);

  return (
    <aside className="w-full border-b border-slate-800 bg-slate-950/95 lg:w-80 lg:min-h-screen lg:border-r lg:border-b-0">
      <div className="p-6">
        <div className="mb-8 rounded-3xl bg-slate-900/90 p-6 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Syncademy</p>
            <span
              className={`text-xs font-semibold px-2 py-1 rounded ${
                isOnline ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
              }`}
            >
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-white">{user.name}</h1>
          <p className="mt-2 text-sm text-slate-400">{user.role === 'admin' ? '🏫 School Admin' : '👨‍🎓 Student'} Portal</p>
          {user.schoolId && <p className="mt-2 text-xs uppercase tracking-[0.2em] text-indigo-300">{user.schoolId}</p>}
          
          {/* Show balance for students */}
          {showBalance && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400">💰 Balance</p>
              <p className="text-xl font-bold text-indigo-300">{balance.toLocaleString()} units</p>
            </div>
          )}
        </div>

        <nav className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block rounded-2xl px-4 py-3 text-sm font-medium transition duration-200 ${
                location.pathname === item.path || location.pathname.startsWith(item.path)
                  ? 'bg-indigo-600 text-white shadow-soft'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={onLogout}
          className="mt-8 w-full rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-400 transition duration-200"
        >
          Log out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
