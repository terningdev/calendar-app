# One.com Domain Setup Guide

## Option 1: Hybrid Setup (Recommended)

### Backend: Railway (Free Node.js hosting)
- Deploy to: https://railway.app
- Database: MongoDB Atlas (already configured)
- URL: https://your-app.railway.app

### Frontend: One.com (Your domain)
- Upload built React files to public_html
- Domain: https://yourdomain.com

### Steps:
1. Deploy backend to Railway
2. Update frontend/.env.production with Railway URL
3. Run build-for-onecom.bat
4. Upload frontend/build/* to One.com public_html

## Option 2: Subdomain Setup

### Main site: One.com
- https://yourdomain.com (static site/landing page)

### App: External hosting
- https://app.yourdomain.com (CNAME to Railway)
- Or https://calendar.yourdomain.com

## Option 3: Full External (Easiest)

### Use Railway for everything:
- Backend: https://your-backend.railway.app
- Frontend: https://your-frontend.railway.app
- Point your One.com domain to Railway using CNAME

## DNS Configuration for One.com:
```
Type: CNAME
Name: app (or calendar)
Value: your-app.railway.app
```