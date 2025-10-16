# 📅 Professional Calendar & Ticket Management System

A modern, full-stack web application for managing support tickets, technician scheduling, and department operations with an intuitive calendar interface and real-time system monitoring.

🌐 **Live Demo:** [terning.info](https://terning.info)

## ✨ Key Features

### 🎯 **Ticket Management**
- **Create & Track Tickets** - Comprehensive ticket creation with priority levels, categories, and descriptions
- **Multi-Department Support** - Filter and assign tickets across different departments
- **Activity Tracking** - Unique activity numbers for easy reference and tracking
- **Smart Assignment** - Assign tickets to specific technicians with skill-based filtering
- **Mobile-Optimized** - Fully responsive design for mobile ticket management

### 📅 **Calendar Integration**
- **Visual Scheduling** - Interactive calendar view with drag-and-drop functionality
- **Color-Coded Status** - Instant visual feedback with customizable color schemes
- **Day/Week/Month Views** - Multiple calendar perspectives for different planning needs
- **Click-to-Edit** - Direct ticket editing from calendar events
- **Real-Time Updates** - Live synchronization across all views

### 👥 **Team Management**
- **Department Organization** - Hierarchical department structure with flexible assignments
- **Technician Profiles** - Detailed profiles with skills, contact info, and department affiliations
- **Skill-Based Filtering** - Intelligent technician suggestions based on ticket requirements
- **Alphabetical Sorting** - Organized lists for easy navigation

### 🛠 **Administrator Tools**
- **System Status Monitoring** - Real-time backend and database connection status
- **Console Logging** - Built-in error tracking and debugging tools
- **Theme Customization** - Light/dark mode with custom color schemes
- **Multi-Language Support** - English and Norwegian language options
- **Settings Management** - Centralized configuration panel

### 🌙 **Modern UI/UX**
- **Dark/Light Themes** - Elegant theme switching with system preference detection
- **Responsive Design** - Seamless experience across desktop, tablet, and mobile
- **Accessibility** - WCAG compliant with keyboard navigation and screen reader support
- **Intuitive Navigation** - Clean, modern interface with logical workflows

## 🚀 How to Use

### **Getting Started**

1. **Access the Application**
   - Visit [terning.info](https://terning.info) for the live version
   - Or set up locally following the development guide below

2. **Set Up Your Organization**
   ```
   Administrator Tab → Manage Departments → Add Department
   Administrator Tab → Manage Technicians → Add Technician
   ```

### **Daily Workflow**

#### **📋 Creating Tickets**
1. Navigate to **Tickets** tab
2. Click **"Add New Ticket"**
3. Fill in details:
   - **Title** - Brief description of the issue
   - **Activity Number** - Auto-generated tracking number
   - **Description** - Detailed problem description
   - **Priority** - Low, Medium, High, Critical
   - **Category** - Hardware, Software, Network, etc.
   - **Department** - Select relevant department
   - **Technician** - Choose from filtered list
   - **Scheduled Date/Time** - When the work should be done

#### **📅 Calendar Management**
1. Go to **Calendar** tab
2. **View Options:**
   - Click **Month/Week/Day** for different perspectives
   - Use **Today** button to return to current date
   - Navigate with **Previous/Next** arrows

3. **Interact with Events:**
   - Click any ticket to view/edit details
   - See color-coded status at a glance
   - Filter by technician or department

#### **⚙️ System Administration**
1. Access **Administrator** tab
2. **Manage Teams:**
   - Add/edit departments
   - Create technician profiles
   - Assign skills and departments

3. **Monitor System:**
   - Click **Settings** to view system status
   - Check backend connectivity (Railway)
   - Monitor database connection (MongoDB Atlas)
   - Access error console for troubleshooting

### **Mobile Usage**
- **Responsive Layout** - All features available on mobile devices
- **Touch-Friendly** - Optimized buttons and navigation for touch screens
- **Compact Views** - Efficient use of screen space with stacked layouts
- **Quick Access** - Essential functions prioritized in mobile interface

## 🏗️ Architecture

### **Production Stack**
- **Frontend:** React 18 deployed on One.com static hosting
- **Backend:** Node.js/Express API hosted on Railway
- **Database:** MongoDB Atlas cloud database
- **Monitoring:** Built-in system status checking

### **Key Technologies**
```
Frontend: React 18, React Router, React Big Calendar, Axios
Backend:  Node.js, Express, Mongoose, JWT ready
Database: MongoDB Atlas with connection pooling
Hosting:  Railway (backend) + One.com (frontend)
```

## 💡 Advanced Features

### **🔍 Smart Filtering**
- **Department-Based** - Filter technicians by department when creating tickets
- **Real-Time Search** - Instant filtering across all data
- **Status-Based** - View tickets by completion status
- **Date Range** - Filter by scheduled date ranges

### **🎨 Customization**
- **Color Themes** - Customize ticket status colors
- **Calendar Colors** - Department-specific color coding
- **Language Settings** - Switch between English and Norwegian
- **Layout Preferences** - Remember user interface preferences

### **📊 System Monitoring**
```
Settings → System Status → View Real-Time Connection Status
🟢 Backend: Connected to Railway
🟢 Database: Connected to MongoDB Atlas
🔄 Refresh button for manual status checks
```

## 🛠️ Development Setup

### **Prerequisites**
- Node.js 18+
- Git
- MongoDB Atlas account (or local MongoDB)

### **Local Development**
```bash
# Clone repository
git clone https://github.com/terningdev/calendar-app.git
cd calendar-app

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB connection string
npm start

# Frontend setup (new terminal)
cd frontend
npm install
npm start
```

### **Environment Configuration**
```bash
# Backend (.env)
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_key

# Frontend (.env.development)
REACT_APP_API_URL=http://localhost:5000/api

# Frontend (.env.production)
REACT_APP_API_URL=https://your-railway-backend.railway.app/api
```

## 🚀 Deployment

### **Automatic Deployment**
1. **Backend:** Automatically deploys to Railway on GitHub push
2. **Frontend:** Build and upload to One.com hosting
```bash
npm run build
# Upload build/ contents to your domain hosting
```

### **Manual Deployment**
```bash
# Quick build script
./quick-deploy.bat

# PowerShell automation
./auto-deploy.ps1
```

## 📞 Support & Documentation

### **User Guides**
- Each interface includes contextual help
- Tooltips and form validation guide usage
- Error messages provide actionable feedback

### **System Requirements**
- **Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile:** iOS 14+, Android 8+
- **Network:** Stable internet connection for real-time features

### **Troubleshooting**
1. **Check System Status** in Administrator → Settings
2. **View Console Logs** for detailed error information
3. **Refresh Connection** using the status refresh button

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for efficient team management and scheduling**

*Live at [terning.info](https://terning.info) | Powered by Railway & MongoDB Atlas*