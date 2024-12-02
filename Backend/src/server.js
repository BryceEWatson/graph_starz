const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
