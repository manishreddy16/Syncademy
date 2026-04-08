import { useEffect, useState } from 'react';
import { getPendingSyncs } from '../utils/offlineStorage';
import { getOnlineStatus, subscribeToOnlineStatus } from '../utils/onlineStatus';
import { syncPendingData } from '../utils/autoSync';

interface PendingTasksSectionProps {
  user: any;
}

const PendingTasksSection = ({ user }: PendingTasksSectionProps) => {
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineStatus(setIsOnline);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadPendingTasks = async () => {
      const tasks = await getPendingSyncs();
      setPendingTasks(tasks);
    };

    loadPendingTasks();
    const interval = setInterval(loadPendingTasks, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncPendingData();
      setPendingTasks([]);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (pendingTasks.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-yellow-700 bg-yellow-950/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <h2 className="text-lg font-semibold text-yellow-400">Pending Tasks</h2>
            <p className="text-yellow-300/80 text-sm">
              {pendingTasks.length} action{pendingTasks.length !== 1 ? 's' : ''} waiting to sync
            </p>
          </div>
        </div>
        {isOnline && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 rounded-lg bg-yellow-600 text-white font-medium hover:bg-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {pendingTasks.map((task, idx) => (
          <div key={idx} className="p-3 bg-yellow-900/20 rounded border border-yellow-700/30 flex items-center justify-between">
            <div className="flex-1">
              {task.key.startsWith('assignment_') && (
                <p className="text-yellow-200 text-sm">
                  📝 <span className="font-medium">Assignment Submission</span> - {task.key}
                </p>
              )}
              {task.key.startsWith('payment_') && (
                <p className="text-yellow-200 text-sm">
                  💳 <span className="font-medium">Payment Request</span> - {task.key}
                </p>
              )}
              {task.key.startsWith('resource_') && (
                <p className="text-yellow-200 text-sm">
                  📄 <span className="font-medium">Resource Upload</span> - {task.key}
                </p>
              )}
              {!task.key.startsWith('assignment_') &&
                !task.key.startsWith('payment_') &&
                !task.key.startsWith('resource_') && (
                  <p className="text-yellow-200 text-sm">
                    ⏳ <span className="font-medium">Pending Action</span> - {task.key}
                  </p>
                )}
            </div>
            <span className="text-xs font-medium text-yellow-300 whitespace-nowrap ml-2">
              {!isOnline ? 'Offline' : 'Ready to sync'}
            </span>
          </div>
        ))}
      </div>

      {!isOnline && (
        <p className="text-yellow-300/80 text-sm mt-4 text-center">
          You're currently offline. These tasks will sync automatically when you're back online.
        </p>
      )}
    </div>
  );
};

export default PendingTasksSection;
