// Safe localStorage utility that works in both browser and SSR environments
export const safeLocalStorage = {
  getItem: (key) => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage.getItem failed:', error);
      return null;
    }
  },
  
  setItem: (key, value) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('localStorage.setItem failed:', error);
    }
  },
  
  removeItem: (key) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('localStorage.removeItem failed:', error);
    }
  }
};