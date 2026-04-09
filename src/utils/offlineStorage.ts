// Offline storage using IndexedDB
// Fallback to localStorage if IndexedDB fails

const DB_NAME = 'syncademy_offline_db';
const DB_VERSION = 1;
const OFFLINE_PREFIX = 'offline_';
const PENDING_PREFIX = 'pending_';
const PENDING_SYNC_PREFIX = 'pending_sync_';

export interface StorageItem {
  key: string;
  value: any;
  timestamp: number;
  synced?: boolean;
}

interface PendingSyncRecord {
  key: string;
  status: 'pending' | 'synced';
  addedAt: number;
  item: StorageItem;
}

let db: IDBDatabase | null = null;

// Initialize IndexedDB
export const initOfflineStorage = async (): Promise<void> => {
  if (db) return;

  await new Promise<void>((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('IndexedDB failed, falling back to localStorage');
        resolve();
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
        resolve();
      };
    } catch (error) {
      console.warn('Failed to initialize IndexedDB:', error);
      resolve();
    }
  });
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
    localStorage.setItem(`${OFFLINE_PREFIX}${key}`, JSON.stringify(item));
    if (markForSync) {
      localStorage.setItem(`${PENDING_SYNC_PREFIX}${key}`, JSON.stringify(item));
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
      syncStore.put({ key, status: 'pending', addedAt: Date.now(), item });
    }
  } catch (error) {
    console.warn('Failed to set offline item, using localStorage:', error);
    localStorage.setItem(`${OFFLINE_PREFIX}${key}`, JSON.stringify(item));
    if (markForSync) {
      localStorage.setItem(`${PENDING_SYNC_PREFIX}${key}`, JSON.stringify(item));
    }
  }
};

// Get item from offline storage
export const getOfflineItem = async (key: string): Promise<any | null> => {
  if (!db) {
    const item = localStorage.getItem(`${OFFLINE_PREFIX}${key}`);
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

const getPendingSyncsFromDB = async (): Promise<StorageItem[]> => {
  if (!db) {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PENDING_SYNC_PREFIX))
      .map((k) => {
        const item = localStorage.getItem(k);
        return item ? JSON.parse(item) as StorageItem : null;
      })
      .filter(Boolean) as StorageItem[];
  }

  try {
    const transaction = db.transaction(['pendingSyncs'], 'readonly');
    const store = transaction.objectStore('pendingSyncs');

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const result = request.result || [];
        resolve(result.map((record: PendingSyncRecord) => record.item));
      };
      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (error) {
    console.warn('Failed to get pending syncs from DB:', error);
    return [];
  }
};

export const getPendingSyncs = async (): Promise<StorageItem[]> => {
  const localPending = await getAllPendingTasks();
  const dbPending = await getPendingSyncsFromDB();
  return [...localPending, ...dbPending];
};

export const getAllPendingTasks = async (): Promise<StorageItem[]> => {
  const pendingKeys = Object.keys(localStorage).filter((k) => k.startsWith(PENDING_PREFIX));
  const pendingItems: StorageItem[] = [];

  for (const key of pendingKeys) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) continue;
      const items = JSON.parse(stored);
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          pendingItems.push({
            key: item.key || item.offlineKey || `${key}_${JSON.stringify(item)}`,
            value: item,
            timestamp: item.timestamp || Date.now(),
            synced: false,
          });
        });
      }
    } catch (error) {
      console.warn('Failed to parse pending task:', error);
    }
  }

  return pendingItems;
};

export const getPendingSyncsByPrefix = async (prefix: string): Promise<StorageItem[]> => {
  const all = await getPendingSyncs();
  return all.filter((item) => item.key.startsWith(prefix));
};

export const getOfflineItemsByPrefix = async (prefix: string): Promise<StorageItem[]> => {
  if (!db) {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(OFFLINE_PREFIX))
      .map((k) => {
        const item = localStorage.getItem(k);
        return item ? JSON.parse(item) : null;
      })
      .filter(Boolean)
      .filter((item) => item.key.startsWith(prefix));
  }

  try {
    const transaction = db.transaction(['items'], 'readonly');
    const store = transaction.objectStore('items');

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve((request.result || []).filter((item: StorageItem) => item.key.startsWith(prefix)));
      };
      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (error) {
    console.warn('Failed to get offline items by prefix:', error);
    return [];
  }
};

const getPendingStorageKey = (type: string): string => `${PENDING_PREFIX}${type}`;

export const savePending = async (type: string, value: any): Promise<void> => {
  const key = getPendingStorageKey(type);
  const stored = localStorage.getItem(key);
  const existing = stored ? JSON.parse(stored) : [];
  existing.push(value);
  localStorage.setItem(key, JSON.stringify(existing));
};

export const getPendingItems = async (type: string): Promise<any[]> => {
  const key = getPendingStorageKey(type);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

export const removePendingItem = async (type: string, itemKey: string): Promise<void> => {
  const key = getPendingStorageKey(type);
  const stored = localStorage.getItem(key);
  if (!stored) return;
  const existing = JSON.parse(stored).filter((item: any) => item.key !== itemKey && item.offlineKey !== itemKey);
  localStorage.setItem(key, JSON.stringify(existing));
};

export const syncPending = async (type: string, handler: (item: any) => Promise<void>): Promise<void> => {
  const pending = await getPendingItems(type);
  for (const item of pending) {
    try {
      await handler(item);
      await removePendingItem(type, item.key || item.offlineKey || JSON.stringify(item));
    } catch (error) {
      console.warn(`Failed to sync pending ${type} item:`, error);
    }
  }
};

// Mark item as synced
export const markAsSynced = async (key: string): Promise<void> => {
  if (!db) {
    localStorage.removeItem(`${PENDING_SYNC_PREFIX}${key}`);
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
      .filter((k) => k.startsWith(OFFLINE_PREFIX) || k.startsWith(PENDING_SYNC_PREFIX) || k.startsWith(PENDING_PREFIX))
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
    localStorage.removeItem(`${OFFLINE_PREFIX}${key}`);
    localStorage.removeItem(`${PENDING_SYNC_PREFIX}${key}`);
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
