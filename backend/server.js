const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const connectDB = async () => {
  try {
    let connectionString = process.env.MONGODB_URI;
    
    // If no MongoDB URI is provided, create a persistent local database
    if (!connectionString || connectionString.includes('mongodb://localhost:27017/ticket_management')) {
      // Try to use a persistent local file database first
      connectionString = `mongodb://localhost:27017/ticket_management_persistent`;
      
      try {
        await mongoose.connect(connectionString, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        console.log('Connected to local MongoDB (persistent)');
        return;
      } catch (localError) {
        console.log('Local MongoDB not available, using in-memory database');
        // Fall back to in-memory if local MongoDB is not available
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = new MongoMemoryServer({
          instance: {
            dbPath: './data/db', // This will create a persistent data folder
          }
        });
        await mongod.start();
        connectionString = mongod.getUri();
        console.log('Using persistent in-memory MongoDB with file storage');
      }
    }
    
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use('/api/departments', require('./routes/departments'));
app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/absences', require('./routes/absences'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});