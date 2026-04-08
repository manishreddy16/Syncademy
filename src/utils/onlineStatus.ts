// Online/Offline status tracking
// Determines connectivity and syncs offline data when online

let isOnline = navigator.onLine;
const listeners: Set<(online: boolean) => void> = new Set();

// Initialize online/offline listeners
export const initOnlineStatus = (): void => {
  window.addEventListener('online', () => {
    isOnline = true;
    notifyListeners(true);
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    notifyListeners(false);
  });
};

// Subscribe to online/offline changes
export const subscribeToOnlineStatus = (callback: (online: boolean) => void): (() => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

// Notify all listeners
const notifyListeners = (online: boolean): void => {
  listeners.forEach((listener) => listener(online));
};

// Get current online status
export const getOnlineStatus = (): boolean => {
  return navigator.onLine;
};

// Check if truly online with a network request
export const checkTrueOnlineStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
    });
    return true;
  } catch {
    return false;
  }
};
