/**
 * Types pour le système de templates de certificats
 */

export interface TemplateLayout {
  orientation: 'portrait' | 'landscape';
  format: 'a4' | 'letter' | 'badge';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface TemplateColors {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  [key: string]: string; // Permet des couleurs personnalisées supplémentaires
}

export interface TemplateFont {
  family: string;
  size: number;
  style: 'normal' | 'bold' | 'italic' | 'bolditalic';
  color?: string;
}

export interface TemplateElement {
  id: string;
  type: 'text' | 'line' | 'border' | 'rectangle' | 'circle' | 'image';

  // Position (peut être un nombre ou une expression comme "center", "pageWidth - 20")
  x?: string | number;
  y?: string | number;

  // Pour les textes
  content?: string;
  font?: string; // Référence à une police dans fonts
  fontSize?: number;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  maxWidth?: string | number;

  // Pour les couleurs
  color?: string;
  fillColor?: string;

  // Pour les lignes
  x1?: string | number;
  y1?: string | number;
  x2?: string | number;
  y2?: string | number;
  lineWidth?: number;

  // Pour les rectangles/bordures
  width?: string | number;
  height?: string | number;
  style?: string;

  // Pour les cercles
  radius?: number;

  // Pour les images
  source?: string;

  // Condition d'affichage (nom d'une propriété du certificat)
  condition?: string;

  // Autres propriétés possibles
  [key: string]: any;
}

export interface TemplateConfig {
  layout: TemplateLayout;
  colors: TemplateColors;
  fonts: Record<string, TemplateFont>;
  elements: TemplateElement[];
}

export interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  template_config: TemplateConfig;
  is_default: boolean;
  preview_image_url?: string;
  background_image_url?: string;
  background_image_type?: 'url' | 'upload';
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  template_config: TemplateConfig;
  is_default?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  template_config?: TemplateConfig;
  is_default?: boolean;
}

/**
 * Variables disponibles pour les templates
 */
export const TEMPLATE_VARIABLES = {
  // Étudiant
  '{student_name}': 'Nom complet de l\'étudiant',
  '{student_email}': 'Email de l\'étudiant',

  // Formation
  '{formation_title}': 'Titre de la formation',
  '{formation_description}': 'Description de la formation',
  '{duration_hours}': 'Durée en heures',

  // Dates
  '{completion_date}': 'Date de complétion (format long)',
  '{completion_date_short}': 'Date de complétion (format court)',
  '{issued_date}': 'Date d\'émission (format long)',
  '{issued_date_short}': 'Date d\'émission (format court)',
  '{current_year}': 'Année actuelle',
  '{current_date}': 'Date actuelle',

  // Certificat
  '{certificate_number}': 'Numéro du certificat',
  '{grade}': 'Note obtenue',
  '{grade_rounded}': 'Note arrondie',

  // Organisation (depuis metadata)
  '{organization_name}': 'Nom de l\'organisation',
  '{organization_address}': 'Adresse de l\'organisation',
  '{director_name}': 'Nom du directeur',
  '{logo_url}': 'URL du logo',
  '{signature_url}': 'URL de la signature',
} as const;

/**
 * Presets de couleurs prédéfinis
 */
export const COLOR_PRESETS = {
  moderne: {
    name: 'Moderne',
    colors: {
      primary: '#3B82F6',
      secondary: '#6B7280',
      text: '#1F2937',
      background: '#FFFFFF',
    },
  },
  classique: {
    name: 'Classique',
    colors: {
      primary: '#3B82F6',
      secondary: '#FBBF24',
      text: '#1F2937',
      background: '#FFFFFF',
    },
  },
  elegant: {
    name: 'Élégant',
    colors: {
      primary: '#9333EA',
      secondary: '#F59E0B',
      text: '#1F2937',
      background: '#FFFFFF',
    },
  },
  corporate: {
    name: 'Corporate',
    colors: {
      primary: '#1E40AF',
      secondary: '#64748B',
      text: '#0F172A',
      background: '#FFFFFF',
    },
  },
} as const;

/**
 * Interface pour l'arrière-plan du template
 */
export interface BackgroundImage {
  type: 'url' | 'upload';
  value: string;
}

/**
 * Interface pour les polices personnalisées
 */
export interface CustomFont {
  id: string;
  name: string;
  file_url: string;
  file_format: 'ttf' | 'otf' | 'woff' | 'woff2';
  file_size?: number;
  created_at: string;
  updated_at?: string;
}

/**
 * Familles de polices disponibles (built-in + possibilité de custom)
 */
export const FONT_FAMILIES = [
  'helvetica',
  'times',
  'courier',
  'arial',
  'verdana',
  'georgia',
  'palatino',
  'garamond',
  'bookman',
  'trebuchet',
  'impact',
] as const;

/**
 * Styles de police disponibles
 */
export const FONT_STYLES = [
  'normal',
  'bold',
  'italic',
  'bolditalic',
] as const;

/**
 * Formats de page disponibles
 */
export const PAGE_FORMATS = [
  'a4',
  'letter',
  'badge',
] as const;

/**
 * Orientations de page disponibles
 */
export const PAGE_ORIENTATIONS = [
  'portrait',
  'landscape',
] as const;
