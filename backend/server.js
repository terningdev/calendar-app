const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Configure CORS with proper origin handling
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://onitio.terning.info',
  'http://onitio.terning.info',
  'https://calendar-app-9uov.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(null, true); // Allow anyway for debugging
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

// Trust proxy - important for production behind reverse proxy/load balancer
app.set('trust proxy', 1);

// Additional headers for cross-origin cookies
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// Request logging middleware - log ALL requests with full details
app.use((req, res, next) => {
  const logPrefix = process.env.NODE_ENV === 'production' ? '[PROD]' : '[DEV]';
  console.log(`${logPrefix} 📨 ${req.method} ${req.originalUrl || req.path}`);
  console.log(`${logPrefix}    Origin: ${req.get('Origin') || 'none'}`);
  console.log(`${logPrefix}    Content-Type: ${req.get('Content-Type') || 'none'}`);
  console.log(`${logPrefix}    User-Agent: ${req.get('User-Agent')?.substring(0, 50) || 'none'}...`);
  next();
});

// Additional middleware to track which handler processes each request
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`📤 Response for ${req.method} ${req.path}: ${typeof data === 'string' && data.includes('<!doctype html>') ? 'HTML' : 'Data'}`);
    originalSend.call(this, data);
  };
  next();
});

app.use(express.json());

// Session configuration with MongoDB store
const getMongoUrl = () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_ATLAS;
  
  // Validate the connection string
  if (mongoUri && (mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://'))) {
    console.log('✅ Valid MongoDB URI found for session store');
    return mongoUri;
  }
  
  console.log('⚠️ No valid MongoDB URI, using fallback for session store');
  return 'mongodb://localhost:27017/ticket_management_dev';
};

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'calendar-app-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: getMongoUrl(),
    touchAfter: 24 * 3600, // lazy session update (24 hours)
    crypto: {
      secret: process.env.SESSION_SECRET || 'calendar-app-secret-key-change-in-production'
    }
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production with HTTPS
    httpOnly: true, // Protect against XSS
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for cross-site with secure
    path: '/'
    // Removed domain restriction to allow same-origin cookies
  },
  name: 'sessionId', // Custom cookie name
  proxy: true, // Trust the reverse proxy
  rolling: true // Reset maxAge on every request
};

app.use(session(sessionConfig));

// Session debugging middleware
app.use((req, res, next) => {
  const logPrefix = process.env.NODE_ENV === 'production' ? '[PROD]' : '[DEV]';
  console.log(`${logPrefix} 📋 Session ID:`, req.sessionID);
  console.log(`${logPrefix} 👤 Session user:`, req.session.user ? req.session.user.email || req.session.user.username : 'none');
  console.log(`${logPrefix} 🍪 Cookies:`, req.headers.cookie ? 'present' : 'missing');
  next();
});

// Database connection
const connectDB = async () => {
  try {
    let connectionString = process.env.MONGODB_URI;
    
    console.log('Environment check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('MONGODB_URI exists:', !!connectionString);
    console.log('MONGODB_URI first 20 chars:', connectionString ? connectionString.substring(0, 20) + '...' : 'undefined');
    
    if (!connectionString) {
      console.log('No MONGODB_URI provided, using in-memory database for development');
      // Use in-memory database when no URI is provided
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = new MongoMemoryServer({
        instance: {
          dbPath: './data/db',
        }
      });
      await mongod.start();
      connectionString = mongod.getUri();
      console.log('✅ Using in-memory MongoDB with file persistence');
    } else if (connectionString.includes('mongodb+srv://')) {
      console.log('Using MongoDB Atlas connection (may fail behind corporate firewall)');
    } else if (connectionString.includes('localhost')) {
      console.log('Using local MongoDB connection');
    } else {
      console.log('Using custom MongoDB connection');
    }
    
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout for faster failure
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4, skip trying IPv6
    });
    
    console.log('✅ Connected to MongoDB successfully');
    console.log('Database name:', mongoose.connection.name);
    
    // Initialize default sysadmin user after DB connection
    const authRoutes = require('./routes/auth');
    if (authRoutes.initializeDefaultUser) {
      await authRoutes.initializeDefaultUser();
    }
    
    // Initialize default role permissions after DB connection (only creates sysadmin)
    const { initializeDefaultPermissions } = require('./models/PermissionsModel');
    if (initializeDefaultPermissions) {
      await initializeDefaultPermissions();
    }
    
    // Initialize system settings
    const { initializeDefaultSettings } = require('./models/SettingsModel');
    if (initializeDefaultSettings) {
      await initializeDefaultSettings();
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // If Atlas connection fails (likely due to firewall), fall back to local/in-memory
    if (error.message.includes('Could not connect to any servers') || 
        error.message.includes('ENOTFOUND') ||
        error.message.includes('timeout')) {
      console.log('🔄 Atlas connection failed (likely corporate firewall). Falling back to in-memory database...');
      
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = new MongoMemoryServer({
          instance: {
            dbPath: './data/db',
          }
        });
        await mongod.start();
        const fallbackUri = mongod.getUri();
        
        await mongoose.connect(fallbackUri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        
        console.log('✅ Successfully connected to fallback in-memory database');
        console.log('📝 Note: Data will persist in ./data/db folder');
        
        // Initialize default sysadmin user after DB connection
        const authRoutes = require('./routes/auth');
        if (authRoutes.initializeDefaultUser) {
          await authRoutes.initializeDefaultUser();
        }
        
        // Initialize default role permissions after DB connection (only creates sysadmin)
        const { initializeDefaultPermissions } = require('./models/PermissionsModel');
        if (initializeDefaultPermissions) {
          await initializeDefaultPermissions();
        }
        
        // Initialize system settings
        const { initializeDefaultSettings } = require('./models/SettingsModel');
        if (initializeDefaultSettings) {
          await initializeDefaultSettings();
        }
        return;
      } catch (fallbackError) {
        console.error('❌ Fallback database connection also failed:', fallbackError.message);
        process.exit(1);
      }
    }
    
    console.error('Full error details:', error);
    process.exit(1);
  }
};

connectDB();

// Routes - log each route registration with error handling
console.log('🔧 Registering API routes...');

try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('  ✅ /api/auth registered successfully');
} catch (error) {
  console.error('  ❌ Failed to load /api/auth:', error.message);
}

try {
  app.use('/api/departments', require('./routes/departments'));
  console.log('  ✅ /api/departments');
} catch (error) {
  console.error('  ❌ Failed to load /api/departments:', error.message);
}

try {
  app.use('/api/technicians', require('./routes/technicians'));
  console.log('  ✅ /api/technicians');
} catch (error) {
  console.error('  ❌ Failed to load /api/technicians:', error.message);
}

try {
  app.use('/api/tickets', require('./routes/tickets'));
  console.log('  ✅ /api/tickets');
} catch (error) {
  console.error('  ❌ Failed to load /api/tickets:', error.message);
}

try {
  app.use('/api/absences', require('./routes/absences'));
  console.log('  ✅ /api/absences');
} catch (error) {
  console.error('  ❌ Failed to load /api/absences:', error.message);
}

try {
  app.use('/api/skills', require('./routes/skills'));
  console.log('  ✅ /api/skills');
} catch (error) {
  console.error('  ❌ Failed to load /api/skills:', error.message);
}

try {
  app.use('/api/bugreports', require('./routes/bugReports'));
  console.log('  ✅ /api/bugreports');
} catch (error) {
  console.error('  ❌ Failed to load /api/bugreports:', error.message);
}

// Permissions routes - load with error handling
try {
  const permissionsRoutes = require('./routes/permissions');
  app.use('/api/permissions', permissionsRoutes);
  console.log('✅ Permissions routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading permissions routes:', error.message);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check endpoint called');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint to verify routes work
app.post('/api/test', (req, res) => {
  console.log('🧪 Test POST endpoint called');
  console.log('🧪 Request body:', req.body);
  res.json({ success: true, message: 'Test POST endpoint working', receivedBody: req.body });
});

// System status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const status = {
      backend: {
        status: 'connected',
        message: 'Render server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: PORT
      },
      database: {
        status: 'unknown',
        message: 'Database status check failed'
      }
    };

    // Check database connection
    try {
      if (mongoose.connection.readyState === 1) {
        // Test database with a simple operation
        await mongoose.connection.db.admin().ping();
        status.database = {
          status: 'connected',
          message: 'MongoDB connection is healthy',
          connectionState: 'connected',
          databaseName: mongoose.connection.name || 'Unknown'
        };
      } else {
        status.database = {
          status: 'disconnected',
          message: 'MongoDB connection is not established',
          connectionState: getConnectionState(mongoose.connection.readyState)
        };
      }
    } catch (dbError) {
      status.database = {
        status: 'error',
        message: `Database error: ${dbError.message}`,
        connectionState: getConnectionState(mongoose.connection.readyState)
      };
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({
      backend: {
        status: 'error',
        message: `Server error: ${error.message}`
      },
      database: {
        status: 'unknown',
        message: 'Could not check database status due to server error'
      }
    });
  }
});

// Helper function to get readable connection state
function getConnectionState(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
}

// Serve static files from the React app (AFTER API routes)
// IMPORTANT: Set fallthrough to true so failed static file lookups continue to next handler
const fs = require('fs');
const possibleBuildPaths = [
  path.join(__dirname, '../frontend/build'),
  path.join(__dirname, 'build'), 
  path.join(__dirname, '../build'),
  path.join(process.cwd(), 'frontend/build'),
  path.join(process.cwd(), 'build'),
  // Additional paths for Render deployment structure
  path.join(process.cwd(), '../frontend/build'),
  '/opt/render/project/src/frontend/build'
];

let buildPath = null;
for (const testPath of possibleBuildPaths) {
  if (fs.existsSync(testPath)) {
    buildPath = testPath;
    break;
  }
}

if (buildPath) {
  console.log(`📁 Serving static files from: ${buildPath}`);
  console.log(`📄 Index.html path: ${path.join(buildPath, 'index.html')}`);
  
  app.use(express.static(buildPath, {
    index: false, // Don't automatically serve index.html
    fallthrough: true // Continue to next middleware if file not found
  }));
} else {
  console.log(`❌ No build directory found in any of the expected locations:`);
  possibleBuildPaths.forEach(p => console.log(`  - ${p}`));
}

// 404 handler for API routes - MUST come after all API routes but after static files
app.use('/api/*', (req, res) => {
  console.log(`⚠️ API route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: `API endpoint not found: ${req.method} ${req.path}` 
  });
});

// Catch-all route to serve React app for any non-API routes
// IMPORTANT: Only serve index.html for routes that DON'T start with /api
app.get('*', (req, res, next) => {
  // Skip serving index.html for API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // Try multiple possible paths for index.html
  const fs = require('fs');
  const possiblePaths = [
    path.join(__dirname, '../frontend/build', 'index.html'),
    path.join(__dirname, 'build', 'index.html'),
    path.join(__dirname, '../build', 'index.html'),
    path.join(process.cwd(), 'frontend/build', 'index.html'),
    path.join(process.cwd(), 'build', 'index.html'),
    // Additional paths for Render deployment structure
    path.join(process.cwd(), '../frontend/build', 'index.html'),
    '/opt/render/project/src/frontend/build/index.html'
  ];
  
  console.log(`🔍 Serving index.html for route: ${req.path}`);
  console.log(`� Current working directory: ${process.cwd()}`);
  console.log(`📁 __dirname: ${__dirname}`);
  
  let indexPath = null;
  for (const testPath of possiblePaths) {
    console.log(`🔍 Testing path: ${testPath}`);
    if (fs.existsSync(testPath)) {
      indexPath = testPath;
      console.log(`✅ Found index.html at: ${indexPath}`);
      break;
    }
  }
  
  if (indexPath) {
    res.sendFile(indexPath);
  } else {
    console.log(`❌ Index.html not found in any of the expected locations`);
    console.log(`📁 Available files in build directory:`);
    
    // List contents of possible build directories for debugging
    possiblePaths.forEach(testPath => {
      const buildDir = path.dirname(testPath);
      if (fs.existsSync(buildDir)) {
        try {
          const files = fs.readdirSync(buildDir);
          console.log(`📂 ${buildDir}: ${files.join(', ')}`);
        } catch (e) {
          console.log(`❌ Could not read directory: ${buildDir}`);
        }
      }
    });
    
    res.status(404).send(`
      <h1>React App Not Found</h1>
      <p>The React application build files could not be located.</p>
      <p>This usually means the build process failed or the files are in an unexpected location.</p>
      <details>
        <summary>Debug Information</summary>
        <pre>
Working Directory: ${process.cwd()}
__dirname: ${__dirname}
Searched paths:
${possiblePaths.map(p => `  - ${p}`).join('\n')}
        </pre>
      </details>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});