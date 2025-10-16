# Deployment README

## Backend Deployment (Railway/Render/Heroku)

### Environment Variables to Set:
```
MONGODB_URI=mongodb+srv://terning:ultraVGA1280%21%3F@cluster0.ybtknfs.mongodb.net/ticket_management?retryWrites=true&w=majority&appName=Cluster0
NODE_ENV=production
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
```

### Deployment Steps:
1. Push code to GitHub
2. Connect your cloud platform to GitHub repository
3. Set environment variables in platform dashboard
4. Deploy!

## Frontend Deployment (Netlify/Vercel)

### Environment Variables to Set:
```
REACT_APP_API_URL=https://your-backend-url.railway.app/api
```

### Build Settings:
- Build command: `npm run build`
- Publish directory: `build`