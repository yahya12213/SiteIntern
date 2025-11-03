import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer les dossiers d'uploads s'ils n'existent pas
const uploadsDir = path.join(__dirname, '../../uploads');
const backgroundsDir = path.join(uploadsDir, 'backgrounds');
const fontsDir = path.join(uploadsDir, 'fonts');

[uploadsDir, backgroundsDir, fontsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage pour les images d'arrière-plan
const backgroundStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, backgroundsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `background-${uniqueSuffix}${ext}`);
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
