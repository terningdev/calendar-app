const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Configure CORS to allow all origins for now (debugging)
app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
  next();
});

app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'calendar-app-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Database connection
const connectDB = async () => {
  try {
    let connectionString = process.env.MONGODB_URI;
    
    console.log('Environment check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('MONGODB_URI exists:', !!connectionString);
    
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