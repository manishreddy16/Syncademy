export const setLocalItem = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Storage error', error);
  }
};

export const getLocalItem = (key: string) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Storage error', error);
    return null;
  }
};

export const removeLocalItem = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Storage error', error);
  }
};
