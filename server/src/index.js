import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import segmentsRouter from './routes/segments.js';
import citiesRouter from './routes/cities.js';
import profilesRouter from './routes/profiles.js';
import calculationSheetsRouter from './routes/calculationSheets.js';
import declarationsRouter from './routes/declarations.js';
import authRouter from './routes/auth.js';
import setupTempRouter from './routes/setup-temp.js';
import adminRouter from './routes/admin.js';
import formationsRouter from './routes/formations.js';
import coursRouter from './routes/cours.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/cities', citiesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/calculation-sheets', calculationSheetsRouter);
app.use('/api/declarations', declarationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/formations', formationsRouter);
app.use('/api/cours', coursRouter);
app.use('/api/setup-temp', setupTempRouter); // TEMPORARY - Remove after database setup!

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', database: 'Connected' });
  } catch (error) {
    res.status(500).json({ status: 'Error', database: 'Disconnected', error: error.message });
  }
});

// Serve static files from the React app (dist folder)
// The dist folder is copied to server/dist during build
const distPath = path.join(__dirname, '../dist');
console.log('📁 __dirname:', __dirname);
console.log('📁 Dist path:', distPath);
console.log('📂 Dist exists?', fs.existsSync(distPath));

if (!fs.existsSync(distPath)) {
  console.error('❌ ERROR: dist folder not found! Build may have failed.');
  console.error('Expected location:', distPath);
}

app.use(express.static(distPath));

// The "catchall" handler: for any request that doesn't match API routes,
// send back React's index.html file.
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  console.log('📄 Attempting to serve:', indexPath);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(500).json({
        error: 'Frontend not found',
        message: 'The frontend build files are missing. Please ensure npm run build was executed.',
        distPath: distPath
      });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});
