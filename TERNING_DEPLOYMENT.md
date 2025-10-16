# Deploying to terning.info (One.com)

## 🚨 IMPORTANT: Two-Part Setup Required

Your calendar app needs:
1. **Backend** (Node.js + MongoDB) → Must be hosted elsewhere
2. **Frontend** (React built files) → Can be hosted on One.com

## Step 1: Upload Frontend to One.com

### Files to Upload:
Upload ALL contents from `C:\dev\Calendar\frontend\build\` to your One.com public_html folder:

```
public_html/
├── index.html
├── asset-manifest.json
└── static/
    ├── css/
    │   └── main.5c210727.css
    └── js/
        └── main.60951e28.js
```

### How to Upload:
1. Log into One.com control panel
2. Go to File Manager or use FTP
3. Navigate to `public_html` folder
4. Delete the "under construction" files
5. Upload ALL files from `frontend\build\` to `public_html`

## Step 2: Deploy Backend (Required for App to Work)

Your Node.js backend CANNOT run on One.com. Deploy it to:

### Option A: Railway (Free, Recommended)
1. Go to https://railway.app
2. Connect your GitHub repository
3. Deploy backend
4. Set environment variables:
   - `MONGODB_URI`: Your Atlas connection string
   - `NODE_ENV`: production

### Option B: Render.com (Free Alternative)
1. Go to https://render.com
2. Create "Web Service"
3. Connect GitHub repository

## Step 3: Update Frontend to Connect to Backend

After deploying backend, update your frontend:

1. Get your backend URL (e.g., `https://your-app.railway.app`)
2. Update `frontend\.env.production`:
   ```
   REACT_APP_API_URL=https://your-backend-url.railway.app/api
   ```
3. Run `npm run build` again
4. Re-upload the new build files to One.com

## 🎯 Quick Fix for Now

If you want to see your frontend working immediately:
1. Upload the current build files to One.com
2. Visit https://terning.info
3. You'll see the frontend, but it won't connect to backend until Step 2 is complete

## Alternative: Full External Hosting

If One.com setup is too complex, deploy both frontend and backend to Railway:
- Cost: Still free
- Domain: Point terning.info to Railway using CNAME record
- Easier management: Everything in one place