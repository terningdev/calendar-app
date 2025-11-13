// Safe localStorage utility that works in both browser and SSR environments
// Also checks for build-time environment to prevent access during webpack builds

// Check if we're in a build environment
const isBuildTime = process.env.NODE_ENV === 'production' && typeof window === 'undefined';
const isSSR = typeof window === 'undefined';

// Mock localStorage for build time
const mockStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0
};

// Safe access to localStorage
const getStorage = () => {
  if (isSSR || isBuildTime) {
    return mockStorage;
  }
  
  try {
    // Test access to localStorage
    const testKey = '__test_localStorage_access__';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return localStorage;
    }
  } catch (error) {
    console.warn('localStorage not available:', error);
  }
  
  return mockStorage;
};

export const safeLocalStorage = {
  getItem: (key) => {
    try {
      return getStorage().getItem(key);
    } catch (error) {
      console.warn('localStorage.getItem failed:', error);
      return null;
    }
  },
  
  setItem: (key, value) => {
    try {
      getStorage().setItem(key, value);
    } catch (error) {
      console.warn('localStorage.setItem failed:', error);
    }
  },
  
  removeItem: (key) => {
    try {
      getStorage().removeItem(key);
    } catch (error) {
      console.warn('localStorage.removeItem failed:', error);
    }
  },
  
  // Safe method to get localStorage keys
  keys: () => {
    try {
      const storage = getStorage();
      if (storage === mockStorage) {
        return [];
      }
      return Object.keys(storage);
    } catch (error) {
      console.warn('localStorage keys access failed:', error);
      return [];
    }
  }
};