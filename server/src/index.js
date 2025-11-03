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
import progressRouter from './routes/progress.js';
import setupProgressRouter from './routes/setup-progress.js';
import migrationSessionsRouter from './routes/migration-sessions.js';
import migrationSessionsCompleteRouter from './routes/migration-sessions-complete.js';
import analyticsRouter from './routes/analytics.js';
import certificatesRouter from './routes/certificates.js';
import setupCertificatesRouter from './routes/setup-certificates.js';
import certificateTemplatesRouter from './routes/certificate-templates.js';
import setupCertificateTemplatesRouter from './routes/setup-certificate-templates.js';
import templateFoldersRouter from './routes/template-folders.js';
import setupTemplateFoldersRouter from './routes/setup-template-folders.js';
import forumsRouter from './routes/forums.js';
import setupForumsRouter from './routes/setup-forums.js';

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
app.use('/api/progress', progressRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/certificate-templates', certificateTemplatesRouter);
app.use('/api/template-folders', templateFoldersRouter);
app.use('/api/forums', forumsRouter);
app.use('/api/setup-temp', setupTempRouter); // TEMPORARY - Remove after database setup!
app.use('/api/setup-progress', setupProgressRouter); // TEMPORARY - Run once to create progress tables
app.use('/api/setup-certificates', setupCertificatesRouter); // TEMPORARY - Run once to create certificates table
app.use('/api/setup-certificate-templates', setupCertificateTemplatesRouter); // TEMPORARY - Run once to create certificate templates table
app.use('/api/setup-template-folders', setupTemplateFoldersRouter); // TEMPORARY - Run once to create template folders table
app.use('/api/setup-forums', setupForumsRouter); // TEMPORARY - Run once to create forum tables
app.use('/api/migration-sessions', migrationSessionsRouter); // TEMPORARY - Migration pour ajouter formation_id
app.use('/api/migration-sessions-complete', migrationSessionsCompleteRouter); // TEMPORARY - Migration complète sessions

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
// Railway deploys server/ directory as /app, where dist/ is copied during build
// Local: dist is at project root (../../dist from server/src)
// Railway: dist is at /app/dist (copied there during build)
const distPath = process.env.RAILWAY_ENVIRONMENT
  ? path.join(process.cwd(), 'dist')  // Railway: /app/dist
  : path.join(__dirname, '../../dist'); // Local: project_root/dist
console.log('📁 __dirname:', __dirname);
console.log('📁 process.cwd():', process.cwd());
console.log('📁 Dist path:', distPath);
console.log('📂 Dist exists?', fs.existsSync(distPath));

if (!fs.existsSync(distPath)) {
  console.error('❌ ERROR: dist folder not found! Build may have failed.');
  console.error('Expected location:', distPath);
  // List what's actually in /app directory for debugging
  try {
    const appDir = process.cwd();
    console.log('📂 Contents of /app (process.cwd()):', fs.readdirSync(appDir));
  } catch (e) {
    console.error('Could not list /app directory:', e.message);
  }
}

// Serve uploaded files (backgrounds, fonts)
const uploadsPath = path.join(__dirname, '../uploads');
console.log('📁 Uploads path:', uploadsPath);
console.log('📂 Uploads exists?', fs.existsSync(uploadsPath));

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('📁 Created uploads directory');
}

app.use('/uploads', express.static(uploadsPath));

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
