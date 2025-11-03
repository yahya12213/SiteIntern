/**
 * Utilitaire pour calculer les dimensions du canvas en fonction du format et de l'orientation
 * Utilise une résolution de 96 DPI (standard web)
 */

export interface CanvasSize {
  width: number;
  height: number;
}

/**
 * Dimensions de base en pixels (96 DPI) pour chaque format en mode paysage (landscape)
 */
const FORMAT_DIMENSIONS: Record<'a4' | 'letter' | 'badge', CanvasSize> = {
  // A4: 297mm × 210mm à 96 DPI
  a4: {
    width: 1122,
    height: 794,
  },
  // Letter: 279.4mm × 215.9mm à 96 DPI
  letter: {
    width: 1056,
    height: 816,
  },
  // Badge (CR80 - carte magnétique standard): 85.6mm × 54mm à 96 DPI
  badge: {
    width: 323,
    height: 204,
  },
};

/**
 * Calcule les dimensions du canvas en fonction du format et de l'orientation
 * @param format - Format de la page (a4, letter, badge)
 * @param orientation - Orientation (portrait ou landscape)
 * @returns Dimensions en pixels { width, height }
 */
export const getCanvasDimensions = (
  format: 'a4' | 'letter' | 'badge',
  orientation: 'portrait' | 'landscape'
): CanvasSize => {
  const baseDimensions = FORMAT_DIMENSIONS[format];

  // En mode portrait, on inverse largeur et hauteur
  if (orientation === 'portrait') {
    return {
      width: baseDimensions.height,
      height: baseDimensions.width,
    };
  }

  // En mode paysage, on garde les dimensions de base
  return { ...baseDimensions };
};

/**
 * Obtient les dimensions recommandées en pixels pour l'image d'arrière-plan
 * @param format - Format de la page
 * @param orientation - Orientation
 * @returns Chaîne formatée avec les dimensions recommandées
 */
export const getRecommendedImageDimensions = (
  format: 'a4' | 'letter' | 'badge',
  orientation: 'portrait' | 'landscape'
): string => {
  const { width, height } = getCanvasDimensions(format, orientation);
  const formatLabel = FORMAT_LABELS[format];
  const orientationLabel = orientation === 'portrait' ? 'Portrait' : 'Paysage';

  return `${width} × ${height} px (${formatLabel} ${orientationLabel})`;
};

/**
 * Labels pour l'affichage des formats
 */
export const FORMAT_LABELS: Record<'a4' | 'letter' | 'badge', string> = {
  a4: 'A4',
  letter: 'Letter',
  badge: 'Badge',
};

/**
 * Dimensions réelles en millimètres pour chaque format
 */
export const FORMAT_DIMENSIONS_MM: Record<'a4' | 'letter' | 'badge', { width: number; height: number }> = {
  a4: { width: 297, height: 210 },
  letter: { width: 279.4, height: 215.9 },
  badge: { width: 85.6, height: 54 },
};

/**
 * Convertit des pixels en millimètres (96 DPI)
 * @param pixels - Valeur en pixels
 * @returns Valeur en millimètres
 */
export const pixelsToMm = (pixels: number): number => {
  return (pixels * 25.4) / 96;
};

/**
 * Convertit des millimètres en pixels (96 DPI)
 * @param mm - Valeur en millimètres
 * @returns Valeur en pixels
 */
export const mmToPixels = (mm: number): number => {
  return (mm * 96) / 25.4;
};
