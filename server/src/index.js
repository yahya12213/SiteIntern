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
import migration010Router from './routes/migration-010-session-formations.js';
import migration011Router from './routes/migration-011-student-payments.js';
import migration012Router from './routes/migration-012-formation-templates.js';
import migration013Router from './routes/migration-013-extend-enrollments.js';
import migration014Router from './routes/migration-014-migrate-session-data.js';
import migration015Router from './routes/migration-015-corps-segment.js';
import analyticsRouter from './routes/analytics.js';
import certificatesRouter from './routes/certificates.js';
import setupCertificatesRouter from './routes/setup-certificates.js';
import certificateTemplatesRouter from './routes/certificate-templates.js';
import setupCertificateTemplatesRouter from './routes/setup-certificate-templates.js';
import templateFoldersRouter from './routes/template-folders.js';
import setupTemplateFoldersRouter from './routes/setup-template-folders.js';
import forumsRouter from './routes/forums.js';
import setupForumsRouter from './routes/setup-forums.js';
import migrationCorpsFormationRouter from './routes/migration-corps-formation.js';
import corpsFormationRouter from './routes/corps-formation.js';
import migration016Router from './routes/migration-016-sessions-formation.js';
import sessionsFormationRouter from './routes/sessions-formation.js';
import migration017Router from './routes/migration-017-sessions-corps-formation.js';
import migration018Router from './routes/migration-018-create-students-table.js';
import migration019Router from './routes/migration-019-create-centres-classes.js';
import migration020Router from './routes/migration-020-update-session-etudiants.js';
import migration021Router from './routes/migration-021-rename-formation-id.js';
import migration022Router from './routes/migration-022-add-discount-to-session-etudiants.js';
import migration023Router from './routes/migration-023-fix-certificates-fk.js';
import migration024Router from './routes/migration-024-seed-certificate-templates.js';
import migration025Router from './routes/migration-025-add-discount-percentage.js';
import migration026Router from './routes/migration-026-create-student-payments.js';
import migration027Router from './routes/migration-027-fix-student-payments.js';
import migration028Router from './routes/migration-028-student-status.js';
import migration029Router from './routes/migration-029-rbac-system.js';
import migration030Router from './routes/migration-030-comptabilite-permissions.js';
import migration031Router from './routes/migration-031-simplified-permissions.js';
import studentsRouter from './routes/students.js';
import centresRouter from './routes/centres.js';
import rolesRouter from './routes/roles.js';

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
app.use('/api/corps-formation', corpsFormationRouter);
app.use('/api/sessions-formation', sessionsFormationRouter);
app.use('/api/students', studentsRouter);
app.use('/api/centres', centresRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/setup-temp', setupTempRouter); // TEMPORARY - Remove after database setup!
app.use('/api/setup-progress', setupProgressRouter); // TEMPORARY - Run once to create progress tables
app.use('/api/setup-certificates', setupCertificatesRouter); // TEMPORARY - Run once to create certificates table
app.use('/api/setup-certificate-templates', setupCertificateTemplatesRouter); // TEMPORARY - Run once to create certificate templates table
app.use('/api/setup-template-folders', setupTemplateFoldersRouter); // TEMPORARY - Run once to create template folders table
app.use('/api/setup-forums', setupForumsRouter); // TEMPORARY - Run once to create forum tables
app.use('/api/migration-sessions', migrationSessionsRouter); // TEMPORARY - Migration pour ajouter formation_id
app.use('/api/migration-sessions-complete', migrationSessionsCompleteRouter); // TEMPORARY - Migration complète sessions
app.use('/api/migration-010', migration010Router); // Migration 010 - session_formations junction table
app.use('/api/migration-011', migration011Router); // Migration 011 - student_payments table
app.use('/api/migration-012', migration012Router); // Migration 012 - formation_templates table
app.use('/api/migration-013', migration013Router); // Migration 013 - extend formation_enrollments
app.use('/api/migration-014', migration014Router); // Migration 014 - migrate existing data
app.use('/api/migration-015', migration015Router); // Migration 015 - add segment_id to corps_formation
app.use('/api/migration-corps-formation', migrationCorpsFormationRouter); // Migration - Corps de formation & Packs
app.use('/api/migration-016', migration016Router); // Migration 016 - Sessions de formation (Classes)
app.use('/api/migration-017', migration017Router); // Migration 017 - Sessions avec Corps de Formation
app.use('/api/migration-018', migration018Router); // Migration 018 - Students table
app.use('/api/migration-019', migration019Router); // Migration 019 - Centres & Classes tables
app.use('/api/migration-020', migration020Router); // Migration 020 - Session_etudiants columns
app.use('/api/migration-021', migration021Router); // Migration 021 - Rename formation_id to corps_formation_id
app.use('/api/migration-022', migration022Router); // Migration 022 - Add discount columns to session_etudiants
app.use('/api/migration-023', migration023Router); // Migration 023 - Fix certificates foreign key
app.use('/api/migration-024', migration024Router); // Migration 024 - Seed default certificate templates
app.use('/api/migration-025', migration025Router); // Migration 025 - Add discount percentage system
app.use('/api/migration-026', migration026Router); // Migration 026 - Create student_payments table
app.use('/api/migration-027', migration027Router); // Migration 027 - Fix student_payments table structure
app.use('/api/migration-028', migration028Router); // Migration 028 - Add student status (valide/abandonne)
app.use('/api/migration-029', migration029Router); // Migration 029 - RBAC system (roles and permissions)
app.use('/api/migration-030', migration030Router); // Migration 030 - Add Gestion Comptable permissions
app.use('/api/migration-031', migration031Router); // Migration 031 - Simplified permission system

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

// Serve uploaded files (backgrounds, fonts, student photos)
// Use UPLOADS_PATH env variable if set (for Railway persistent volume)
// Otherwise use local directory (for development)
const uploadsPath = process.env.UPLOADS_PATH || path.join(__dirname, '../uploads');
console.log('📁 Uploads path:', uploadsPath);
console.log('📂 Uploads exists?', fs.existsSync(uploadsPath));
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Ensure subdirectories exist
const subdirs = ['profiles', 'backgrounds', 'fonts'];
subdirs.forEach(subdir => {
  const subdirPath = path.join(uploadsPath, subdir);
  if (!fs.existsSync(subdirPath)) {
    fs.mkdirSync(subdirPath, { recursive: true });
    console.log(`📁 Created ${subdir} subdirectory`);
  }
});

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
