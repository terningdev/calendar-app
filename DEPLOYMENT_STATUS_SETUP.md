# Deployment Status Setup Guide

## Overview
The Deployment Status popup provides real-time notifications about your Render deployments directly in your app. No more switching to the Render dashboard!

## Setup Instructions

### 1. Get Your Render API Credentials

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Navigate to your service (calendar-app)
3. Copy the **Service ID** from the URL (e.g., `srv-xxxxxxxxxxxxxxxxxxxxx`)
4. Go to Account Settings → API Keys
5. Create a new API key or use an existing one

### 2. Configure Environment Variables

Update your environment files with your actual Render credentials:

**For Development (.env.development):**
```bash
REACT_APP_RENDER_SERVICE_ID=srv-xxxxxxxxxxxxxxxxxxxxx
REACT_APP_RENDER_API_KEY=rnd_xxxxxxxxxxxxxxxxxxxxx
```

**For Production (.env.production):**
```bash
REACT_APP_RENDER_SERVICE_ID=srv-xxxxxxxxxxxxxxxxxxxxx
REACT_APP_RENDER_API_KEY=rnd_xxxxxxxxxxxxxxxxxxxxx
```

### 3. Features

✅ **Real-time deployment tracking** - Checks status every 10 seconds  
✅ **Browser notifications** - Get notified even when tab is in background  
✅ **Visual status indicators** - Color-coded dots with animations  
✅ **Smart refresh button** - Appears when deployment is complete  
✅ **Error handling** - Direct links to Render dashboard when builds fail  
✅ **Duration tracking** - See how long deployments take  

### 4. Status Types

- 🟢 **Live** - Deployment successful, app is running
- 🟡 **Building** - Code is being built
- 🔵 **Deploying** - Built code is being deployed
- 🔴 **Failed** - Build or deployment failed
- ⏳ **Queued** - Waiting to start

### 5. Browser Notifications

The popup will request notification permissions on first load. Allow notifications to get alerts even when the tab is in the background.

### 6. Usage

- The popup appears automatically when a new deployment is detected
- Click the "×" to minimize (it will reappear for status changes)
- Click "🔄 Refresh Page" when deployment is complete
- Click "📊 View in Render" to go to the dashboard for failed builds

### 7. Testing

To test without API credentials, the component will work but show a warning in the console. Configure the API credentials to enable full functionality.

## API Endpoints Used

- `GET https://api.render.com/v1/services/{serviceId}/deploys` - Get deployment list
- Headers: `Authorization: Bearer {apiKey}`

## Troubleshooting

**No popup appears:**
- Check that environment variables are set correctly
- Verify API key has permissions
- Check browser console for errors

**Notifications not working:**
- Allow notification permissions in browser
- Check browser notification settings

**API errors:**
- Verify service ID format (starts with `srv-`)
- Verify API key format (starts with `rnd_`)
- Check API key permissions in Render dashboard