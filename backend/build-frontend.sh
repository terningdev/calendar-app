#!/bin/bash

echo "=== Starting frontend build process ==="
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

echo "=== Navigating to frontend directory ==="
cd ../frontend || exit 1
echo "Current directory: $(pwd)"

echo "=== Installing frontend dependencies ==="
npm install

echo "=== Building React application ==="
npm run build

echo "=== Checking if build directory exists ==="
if [ -d "build" ]; then
    echo "✅ Build directory found!"
    echo "Build directory contents:"
    ls -la build/
    
    echo "=== Copying build files to backend ==="
    cp -r build ../backend/
    echo "✅ Files copied to backend/build/"
    
    echo "=== Verifying copy ==="
    ls -la ../backend/build/
else
    echo "❌ Build directory not found!"
    exit 1
fi

echo "=== Frontend build process completed successfully ==="