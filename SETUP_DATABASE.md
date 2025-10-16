# How to Set Up Persistent Database Storage

## Option 1: MongoDB Atlas (Cloud) - RECOMMENDED ⭐

**This is the easiest and most reliable option for persistent data storage.**

### Steps:
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free" 
3. Sign up with your email
4. Create a new project (name it "Ticket Management")
5. Build a database → Choose "M0 Sandbox" (FREE)
6. Choose a cloud provider and region (closest to you)
7. Create cluster (wait 3-5 minutes)
8. Go to "Database Access" → Add New Database User
   - Create username and password (save these!)
   - Grant "Read and write to any database"
9. Go to "Network Access" → Add IP Address → "Allow Access from Anywhere" (0.0.0.0/0)
10. Go to "Database" → Connect → "Connect your application"
11. Copy the connection string
12. Update your `.env` file:
    ```
    MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxxx.mongodb.net/ticket_management?retryWrites=true&w=majority
    ```

### Benefits:
- ✅ Data persists forever
- ✅ Automatic backups
- ✅ Accessible from anywhere
- ✅ Free tier available
- ✅ No local setup required

---

## Option 2: Local MongoDB Installation

### Install MongoDB Community Server:
1. Download from: https://www.mongodb.com/try/download/community
2. Run the installer (choose "Complete" installation)
3. Install as Windows Service
4. Start MongoDB service
5. Update `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017/ticket_management_persistent
   ```

### Benefits:
- ✅ Data persists locally
- ✅ No internet required
- ❌ More complex setup
- ❌ Manual backups needed

---

## Option 3: Keep Current Setup (In-Memory)

If you want to keep the current in-memory setup for testing:
- Leave `MONGODB_URI` empty in `.env`
- Data will be lost on restart
- Good for development and testing

---

## Recommendation

**Use MongoDB Atlas (Option 1)** - it takes 10 minutes to set up and your data will be safe forever with automatic backups.