const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const neo4j = require('./db/neo4j');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
const authRouter = require('./routes/auth');
const uploadRouter = require('./routes/upload');
const graphRouter = require('./routes/graph');
const imagesRouter = require('./routes/images');
const healthRouter = require('./routes/health');

app.use('/auth', authRouter);
app.use('/upload', uploadRouter);
app.use('/graph', graphRouter);
app.use('/images', imagesRouter);
app.use('/health', healthRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
async function start() {
    
    try {
        // Initialize Neo4j connection
        await neo4j.initialize();
        
        // Start server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received. Closing Neo4j connection...');
    await neo4j.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received. Closing Neo4j connection...');
    await neo4j.close();
    process.exit(0);
});

// Start the server
start();
