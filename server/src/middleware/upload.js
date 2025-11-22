import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer les dossiers d'uploads s'ils n'existent pas
// Use UPLOADS_PATH env variable for Railway persistent volumes, fallback to local for development
const uploadsDir = process.env.UPLOADS_PATH || path.join(__dirname, '../../uploads');
const backgroundsDir = path.join(uploadsDir, 'backgrounds');
const fontsDir = path.join(uploadsDir, 'fonts');
const profilesDir = path.join(uploadsDir, 'profiles');
const declarationsDir = path.join(uploadsDir, 'declarations'); // Nouveau: pièces jointes déclarations

console.log('📁 Verifying upload directories...');
console.log(`📁 Base uploads path: ${uploadsDir} ${process.env.UPLOADS_PATH ? '(from UPLOADS_PATH env)' : '(default local)'}`);
[uploadsDir, backgroundsDir, fontsDir, profilesDir, declarationsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`  Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ✓ Directory created successfully`);
  } else {
    console.log(`  ✓ Directory exists: ${dir}`);
  }
});

// Storage pour les images d'arrière-plan
const backgroundStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists at write time
    try {
      if (!fs.existsSync(backgroundsDir)) {
        console.log(`📁 Creating backgrounds directory at write time: ${backgroundsDir}`);
        fs.mkdirSync(backgroundsDir, { recursive: true });
      }
      console.log(`📁 Background upload destination: ${backgroundsDir}`);
      cb(null, backgroundsDir);
    } catch (err) {
      console.error(`❌ Error ensuring backgrounds directory exists:`, err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `background-${uniqueSuffix}${ext}`;
    console.log(`📁 Background filename: ${filename}`);
    cb(null, filename);
  }
});

// Storage pour les polices
const fontStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, fontsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `font-${uniqueSuffix}${ext}`);
  }
});

// Storage pour les photos de profil
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists at write time
    try {
      if (!fs.existsSync(profilesDir)) {
        console.log(`📁 Creating profiles directory at write time: ${profilesDir}`);
        fs.mkdirSync(profilesDir, { recursive: true });
      }
      console.log(`📁 Profile upload destination: ${profilesDir}`);
      cb(null, profilesDir);
    } catch (err) {
      console.error(`❌ Error ensuring profiles directory exists:`, err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `profile-${uniqueSuffix}${ext}`;
    console.log(`📁 Profile filename: ${filename}`);
    cb(null, filename);
  }
});

// Storage pour les pièces jointes de déclarations
const declarationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(declarationsDir)) {
        console.log(`📁 Creating declarations directory at write time: ${declarationsDir}`);
        fs.mkdirSync(declarationsDir, { recursive: true });
      }
      console.log(`📁 Declaration attachment upload destination: ${declarationsDir}`);
      cb(null, declarationsDir);
    } catch (err) {
      console.error(`❌ Error ensuring declarations directory exists:`, err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `declaration-${uniqueSuffix}-${safeOriginalName}`;
    console.log(`📁 Declaration attachment filename: ${filename}`);
    cb(null, filename);
  }
});

// Filtres pour les types de fichiers
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG, WEBP ou SVG.'), false);
  }
};

const fontFileFilter = (req, file, cb) => {
  const allowedExts = ['.ttf', '.otf', '.woff', '.woff2'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format de police non supporté. Utilisez TTF, OTF, WOFF ou WOFF2.'), false);
  }
};

const documentFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporté. Utilisez PDF, Excel, Word ou images (JPG, PNG, WEBP).'), false);
  }
};

// Middlewares multer
export const uploadBackground = multer({
  storage: backgroundStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  }
}).single('background');

export const uploadFont = multer({
  storage: fontStorage,
  fileFilter: fontFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB max
  }
}).single('font');

export const uploadProfileImage = multer({
  storage: profileStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3 MB max
  }
}).single('profile_image');

export const uploadDeclarationAttachment = multer({
  storage: declarationStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB max
  }
}).single('attachment');

// Helper pour supprimer un fichier
export const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};
