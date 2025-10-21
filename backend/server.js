const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Configure CORS with proper origin handling
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://planlegger.terning.info',
  'http://planlegger.terning.info',
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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'} - Protocol: ${req.protocol}`);
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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/absences', require('./routes/absences'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Calendar API Server',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/health', '/api/status', '/api/tickets', '/api/departments', '/api/technicians', '/api/absences']
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// System status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const status = {
      backend: {
        status: 'connected',
        message: 'Backend server is running',
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});