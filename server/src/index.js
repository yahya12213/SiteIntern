import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// CRITICAL: Load environment variables BEFORE any custom imports
// Some modules (like auth.js) validate env vars at load time
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import database connection after dotenv
import pool from './config/database.js';

// Import routes
import segmentsRouter from './routes/segments.js';
import citiesRouter from './routes/cities.js';
import profilesRouter from './routes/profiles.js';
import calculationSheetsRouter from './routes/calculationSheets.js';
import declarationsRouter from './routes/declarations.js';
import authRouter from './routes/auth.js';
import { authenticateToken, requireRole } from './middleware/auth.js';
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
import migration032Router from './routes/migration-032-remove-role-check.js';
import migration033Router from './routes/migration-033-menu-based-permissions.js';
import migration034Router from './routes/migration-034-hierarchical-permissions.js';
import migration035Router from './routes/migration-035-copy-gerant-permissions.js';
import migration036Router from './routes/migration-036-debug-permissions.js';
import migration037Router from './routes/migration-037-fix-role-id.js';
import migration038Router from './routes/migration-038-check-role-id.js';
import migration039Router from './routes/migration-039-sync-role-id.js';
import migration040Router from './routes/migration-040-hierarchical-rbac.js';
import migration041Router from './routes/migration-041-hr-employees.js';
import migration042Router from './routes/migration-042-hr-attendance.js';
import migration043Router from './routes/migration-043-hr-leaves.js';
import migration044Router from './routes/migration-044-hr-settings.js';
import migration045Router from './routes/migration-045-hr-permissions.js';
import migration046Router from './routes/migration-046-fix-worked-minutes-column.js';
import migration047Router from './routes/migration-047-fix-schema-mismatches.js';
import migration048Router from './routes/migration-048-add-missing-permissions.js';
import migration049Router from './routes/migration-049-add-requires-clocking.js';
import migration050Router from './routes/migration-050-add-public-holidays.js';
import migration051Router from './routes/migration-051-add-break-rules.js';
import migration052Router from './routes/migration-052-add-session-type.js';
import migrationFixRouter from './routes/migration-fix-segments-and-sheets.js';
import migrationFixImpressionRouter from './routes/migration-fix-impression-permissions.js';
import migrationFixRoleSyncRouter from './routes/migration-fix-role-sync.js';
import migration053Router from './routes/migration-053-commercialisation-permissions.js';
import migration054Router from './routes/migration-054-assign-all-permissions-to-gerant.js';
import migration055Router from './routes/migration-055-fix-critical-permissions.js';
import migration056Router from './routes/migration-056-accounting-permissions.js';
import migration057Router from './routes/migration-057-declaration-attachments.js';
import migration058Router from './routes/migration-058-sync-missing-permissions.js';
import migration059Router from './routes/migration-059-fix-permission-overlaps.js';
import migration060Router from './routes/migration-060-prospects-system.js';
import migration061Router from './routes/migration-061-validation-workflows.js';
import migration062Router from './routes/migration-062-employee-portal-permissions.js';
import migration063Router from './routes/migration-063-session-student-permissions.js';
import migration064Router from './routes/migration-064-permission-labels-fr.js';
import migration065Router from './routes/migration-065-professor-permissions.js';
import migration066Router from './routes/migration-066-missing-permissions.js';
import migration067Router from './routes/migration-067-hr-alignment.js';
import migration068Router from './routes/migration-068-auto-employee-records.js';
import migration069Router from './routes/migration-069-fix-attendance-clock-time.js';
import migration070Router from './routes/migration-070-permissions-complete.js';
import migration071Router from './routes/migration-071-session-remove-student.js';
import studentsRouter from './routes/students.js';
import centresRouter from './routes/centres.js';
import rolesRouter from './routes/roles.js';
import permissionsRouter from './routes/permissions.js';
import hrEmployeesRouter from './routes/hr-employees.js';
import hrAttendanceRouter from './routes/hr-attendance.js';
import hrLeavesRouter from './routes/hr-leaves.js';
import hrDashboardRouter from './routes/hr-dashboard.js';
import hrSettingsRouter from './routes/hr-settings.js';
import hrClockingRouter from './routes/hr-clocking.js';
import hrPublicHolidaysRouter from './routes/hr-public-holidays.js';
import hrEmployeePortalRouter from './routes/hr-employee-portal.js';
import hrRequestsValidationRouter from './routes/hr-requests-validation.js';
import hrScheduleManagementRouter from './routes/hr-schedule-management.js';
import hrValidationWorkflowsRouter from './routes/hr-validation-workflows.js';
import prospectsRouter from './routes/prospects.js';
import projectsRouter from './routes/projects.js';
import migrationProjectsRouter from './routes/migration-projects.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// CORS Configuration - Allow Railway production URL and localhost
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173',
      'http://localhost:3001',
      'https://spectacular-enthusiasm-production.up.railway.app'
    ];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow if origin is in the allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow any .railway.app subdomain in production
    if (origin.endsWith('.railway.app')) {
      return callback(null, true);
    }

    // Allow in development mode
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/segments', authenticateToken, segmentsRouter);
app.use('/api/cities', authenticateToken, citiesRouter);
app.use('/api/profiles', authenticateToken, profilesRouter);
app.use('/api/calculation-sheets', authenticateToken, calculationSheetsRouter);
app.use('/api/declarations', authenticateToken, declarationsRouter);
app.use('/api/admin', authenticateToken, adminRouter);
app.use('/api/formations', authenticateToken, formationsRouter);
app.use('/api/cours', authenticateToken, coursRouter);
app.use('/api/progress', authenticateToken, progressRouter);
app.use('/api/analytics', authenticateToken, analyticsRouter);
app.use('/api/certificates', authenticateToken, certificatesRouter);
app.use('/api/certificate-templates', authenticateToken, certificateTemplatesRouter);
app.use('/api/template-folders', authenticateToken, templateFoldersRouter);
app.use('/api/forums', authenticateToken, forumsRouter);
app.use('/api/corps-formation', authenticateToken, corpsFormationRouter);
app.use('/api/sessions-formation', authenticateToken, sessionsFormationRouter);
app.use('/api/students', authenticateToken, studentsRouter);
app.use('/api/centres', authenticateToken, centresRouter);
app.use('/api/roles', authenticateToken, rolesRouter);
app.use('/api/permissions', authenticateToken, permissionsRouter);
app.use('/api/hr/employees', authenticateToken, hrEmployeesRouter);
app.use('/api/hr/attendance', authenticateToken, hrAttendanceRouter);
app.use('/api/hr/leaves', authenticateToken, hrLeavesRouter);
app.use('/api/hr/dashboard', authenticateToken, hrDashboardRouter);
app.use('/api/hr/settings', authenticateToken, hrSettingsRouter);
app.use('/api/hr/clocking', authenticateToken, hrClockingRouter);
app.use('/api/hr/public-holidays', authenticateToken, hrPublicHolidaysRouter);
app.use('/api/hr/employee-portal', authenticateToken, hrEmployeePortalRouter);
app.use('/api/hr/requests-validation', authenticateToken, hrRequestsValidationRouter);
app.use('/api/hr/schedule-management', authenticateToken, hrScheduleManagementRouter);
app.use('/api/hr/validation-workflows', authenticateToken, hrValidationWorkflowsRouter);
app.use('/api/prospects', authenticateToken, prospectsRouter);
app.use('/api/projects', authenticateToken, projectsRouter);
app.use('/api/migration-projects', authenticateToken, migrationProjectsRouter);

// ============================================================
// ADMIN-ONLY: Setup and Migration Routes (Protected)
// These routes require admin authentication for security
// ============================================================
const adminOnly = [authenticateToken, requireRole('admin')];

app.use('/api/setup-temp', ...adminOnly, setupTempRouter);
app.use('/api/setup-progress', ...adminOnly, setupProgressRouter);
app.use('/api/setup-certificates', ...adminOnly, setupCertificatesRouter);
app.use('/api/setup-certificate-templates', ...adminOnly, setupCertificateTemplatesRouter);
app.use('/api/setup-template-folders', ...adminOnly, setupTemplateFoldersRouter);
app.use('/api/setup-forums', ...adminOnly, setupForumsRouter);
app.use('/api/migration-sessions', ...adminOnly, migrationSessionsRouter);
app.use('/api/migration-sessions-complete', ...adminOnly, migrationSessionsCompleteRouter);
app.use('/api/migration-010', ...adminOnly, migration010Router);
app.use('/api/migration-011', ...adminOnly, migration011Router);
app.use('/api/migration-012', ...adminOnly, migration012Router);
app.use('/api/migration-013', ...adminOnly, migration013Router);
app.use('/api/migration-014', ...adminOnly, migration014Router);
app.use('/api/migration-015', ...adminOnly, migration015Router);
app.use('/api/migration-corps-formation', ...adminOnly, migrationCorpsFormationRouter);
app.use('/api/migration-016', ...adminOnly, migration016Router);
app.use('/api/migration-017', ...adminOnly, migration017Router);
app.use('/api/migration-018', ...adminOnly, migration018Router);
app.use('/api/migration-019', ...adminOnly, migration019Router);
app.use('/api/migration-020', ...adminOnly, migration020Router);
app.use('/api/migration-021', ...adminOnly, migration021Router);
app.use('/api/migration-022', ...adminOnly, migration022Router);
app.use('/api/migration-023', ...adminOnly, migration023Router);
app.use('/api/migration-024', ...adminOnly, migration024Router);
app.use('/api/migration-025', ...adminOnly, migration025Router);
app.use('/api/migration-026', ...adminOnly, migration026Router);
app.use('/api/migration-027', ...adminOnly, migration027Router);
app.use('/api/migration-028', ...adminOnly, migration028Router);
app.use('/api/migration-029', ...adminOnly, migration029Router);
app.use('/api/migration-030', ...adminOnly, migration030Router);
app.use('/api/migration-031', ...adminOnly, migration031Router);
app.use('/api/migration-032', ...adminOnly, migration032Router);
app.use('/api/migration-033', ...adminOnly, migration033Router);
app.use('/api/migration-034', ...adminOnly, migration034Router);
app.use('/api/migration-035', ...adminOnly, migration035Router);
app.use('/api/migration-036', ...adminOnly, migration036Router);
app.use('/api/migration-037', ...adminOnly, migration037Router);
app.use('/api/migration-038', ...adminOnly, migration038Router);
app.use('/api/migration-039', ...adminOnly, migration039Router);
app.use('/api/migration-040', ...adminOnly, migration040Router);
app.use('/api/migration-041', ...adminOnly, migration041Router);
app.use('/api/migration-042', ...adminOnly, migration042Router);
app.use('/api/migration-043', ...adminOnly, migration043Router);
app.use('/api/migration-044', ...adminOnly, migration044Router);
app.use('/api/migration-045', ...adminOnly, migration045Router);
app.use('/api/migration-046', ...adminOnly, migration046Router);
app.use('/api/migration-047', ...adminOnly, migration047Router);
app.use('/api/migration-048', ...adminOnly, migration048Router);
app.use('/api/migration-049', ...adminOnly, migration049Router);
app.use('/api/migration-050', ...adminOnly, migration050Router);
app.use('/api/migration-051', ...adminOnly, migration051Router);
app.use('/api/migration-052', ...adminOnly, migration052Router);
app.use('/api/migration-053', ...adminOnly, migration053Router);
app.use('/api/migration-054', ...adminOnly, migration054Router);
app.use('/api/migration-055', ...adminOnly, migration055Router);
app.use('/api/migration-056', ...adminOnly, migration056Router);
app.use('/api/migration-057', ...adminOnly, migration057Router);
app.use('/api/migration-058', ...adminOnly, migration058Router);
app.use('/api/migration-059', ...adminOnly, migration059Router);
app.use('/api/migration-060', ...adminOnly, migration060Router);
app.use('/api/migration-061', ...adminOnly, migration061Router);
app.use('/api/migration-062', ...adminOnly, migration062Router);
app.use('/api/migration-063', ...adminOnly, migration063Router);
app.use('/api/migration-064', ...adminOnly, migration064Router);
app.use('/api/migration-065', ...adminOnly, migration065Router);
app.use('/api/migration-066', ...adminOnly, migration066Router);
app.use('/api/migration-067', ...adminOnly, migration067Router);
app.use('/api/migration-068', ...adminOnly, migration068Router);
app.use('/api/migration-069', ...adminOnly, migration069Router);
app.use('/api/migration-070', ...adminOnly, migration070Router);
app.use('/api/migration-071', ...adminOnly, migration071Router);
app.use('/api/migration-fix-segments-and-sheets', ...adminOnly, migrationFixRouter);
app.use('/api/migration-fix-impression-permissions', ...adminOnly, migrationFixImpressionRouter);
app.use('/api/migration-fix-role-sync', ...adminOnly, migrationFixRoleSyncRouter);

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
// Vite builds directly into server/dist (configured in vite.config.ts)
// Both Railway and Local: dist is at server/dist (../dist from server/src)
const distPath = path.join(__dirname, '../dist'); // server/dist
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

// Add explicit CORS headers for uploaded files (prevent cross-origin issues)
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
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
