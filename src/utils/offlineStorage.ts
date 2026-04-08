// Offline storage using IndexedDB
// Fallback to localStorage if IndexedDB fails

const DB_NAME = 'syncademy_offline_db';
const DB_VERSION = 1;

interface StorageItem {
  key: string;
  value: any;
  timestamp: number;
  synced?: boolean;
}

let db: IDBDatabase | null = null;

// Initialize IndexedDB
export const initOfflineStorage = async (): Promise<void> => {
  if (db) return;

  try {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('IndexedDB failed, falling back to localStorage');
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains('items')) {
        database.createObjectStore('items', { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains('pendingSyncs')) {
        database.createObjectStore('pendingSyncs', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event: Event) => {
      db = (event.target as IDBOpenDBRequest).result;
    };
  } catch (error) {
    console.warn('Failed to initialize IndexedDB:', error);
  }
};

// Set item in offline storage
export const setOfflineItem = async (key: string, value: any, markForSync: boolean = false): Promise<void> => {
  const item: StorageItem = {
    key,
    value,
    timestamp: Date.now(),
    synced: false,
  };

  if (!db) {
    // Fallback to localStorage
    localStorage.setItem(`offline_${key}`, JSON.stringify(item));
    if (markForSync) {
      localStorage.setItem(`pending_sync_${key}`, 'true');
    }
    return;
  }

  try {
    const transaction = db.transaction(['items'], 'readwrite');
    const store = transaction.objectStore('items');
    store.put(item);

    if (markForSync) {
      const syncTransaction = db.transaction(['pendingSyncs'], 'readwrite');
      const syncStore = syncTransaction.objectStore('pendingSyncs');
      syncStore.put({ key, status: 'pending', addedAt: Date.now() });
    }
  } catch (error) {
    console.warn('Failed to set offline item, using localStorage:', error);
    localStorage.setItem(`offline_${key}`, JSON.stringify(item));
  }
};

// Get item from offline storage
export const getOfflineItem = async (key: string): Promise<any | null> => {
  if (!db) {
    const item = localStorage.getItem(`offline_${key}`);
    return item ? JSON.parse(item).value : null;
  }

  try {
    const transaction = db.transaction(['items'], 'readonly');
    const store = transaction.objectStore('items');
    
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (error) {
    console.warn('Failed to get offline item:', error);
    return null;
  }
};

// Get all pending syncs
export const getPendingSyncs = async (): Promise<StorageItem[]> => {
  if (!db) {
    const keys = Object.keys(localStorage);
    return keys
      .filter((k) => k.startsWith('pending_sync_'))
      .map((k) => {
        const itemKey = k.replace('pending_sync_', '');
        const item = localStorage.getItem(`offline_${itemKey}`);
        return item ? JSON.parse(item) : null;
      })
      .filter(Boolean);
  }

  try {
    const transaction = db.transaction(['pendingSyncs'], 'readonly');
    const store = transaction.objectStore('pendingSyncs');

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (error) {
    console.warn('Failed to get pending syncs:', error);
    return [];
  }
};

// Mark item as synced
export const markAsSynced = async (key: string): Promise<void> => {
  if (!db) {
    localStorage.removeItem(`pending_sync_${key}`);
    return;
  }

  try {
    const transaction = db.transaction(['pendingSyncs'], 'readwrite');
    const store = transaction.objectStore('pendingSyncs');
    store.delete(key);
  } catch (error) {
    console.warn('Failed to mark as synced:', error);
  }
};

// Clear all offline data
export const clearOfflineStorage = async (): Promise<void> => {
  if (!db) {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('offline_'))
      .forEach((k) => localStorage.removeItem(k));
    return;
  }

  try {
    const transaction = db.transaction(['items', 'pendingSyncs'], 'readwrite');
    transaction.objectStore('items').clear();
    transaction.objectStore('pendingSyncs').clear();
  } catch (error) {
    console.warn('Failed to clear offline storage:', error);
  }
};

// Remove specific item
export const removeOfflineItem = async (key: string): Promise<void> => {
  if (!db) {
    localStorage.removeItem(`offline_${key}`);
    localStorage.removeItem(`pending_sync_${key}`);
    return;
  }

  try {
    const transaction = db.transaction(['items', 'pendingSyncs'], 'readwrite');
    transaction.objectStore('items').delete(key);
    transaction.objectStore('pendingSyncs').delete(key);
  } catch (error) {
    console.warn('Failed to remove offline item:', error);
  }
};
