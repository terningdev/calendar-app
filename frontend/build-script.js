#!/usr/bin/env node

// Custom build script to handle localStorage issues during production build
const { spawn } = require('child_process');

// Set up environment to prevent localStorage access
process.env.NODE_ENV = 'production';
process.env.DISABLE_LOCALSTORAGE = 'true';

// Mock localStorage globally before any other code runs
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0
};

global.sessionStorage = global.localStorage;

// Mock window object for build process
global.window = {
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
  location: { href: '', hostname: 'localhost' },
  navigator: { userAgent: 'node' }
};

// Override Object.keys to handle localStorage safely
const originalObjectKeys = Object.keys;
Object.keys = function(obj) {
  if (obj === global.localStorage || obj === global.sessionStorage) {
    return [];
  }
  return originalObjectKeys.call(this, obj);
};

console.log('Starting build with localStorage protection...');

// Run the actual React build
const buildProcess = spawn('npx', ['react-scripts', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    DISABLE_LOCALSTORAGE: 'true'
  }
});

buildProcess.on('close', (code) => {
  console.log(`Build process exited with code ${code}`);
  process.exit(code);
});

buildProcess.on('error', (error) => {
  console.error('Build process error:', error);
  process.exit(1);
});