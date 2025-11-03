/**
 * Moteur de génération de certificats PDF dynamique
 * basé sur des templates configurables
 */
import jsPDF from 'jspdf';
import type { Certificate } from '@/lib/api/certificates';
import type {
  CertificateTemplate,
  TemplateElement,
  TemplateFont,
} from '@/types/certificateTemplate';

/**
 * Classe principale du moteur de génération de certificats
 */
export class CertificateTemplateEngine {
  private doc: jsPDF;
  private certificate: Certificate;
  private template: CertificateTemplate;
  private pageWidth: number;
  private pageHeight: number;

  constructor(certificate: Certificate, template: CertificateTemplate) {
    this.certificate = certificate;
    this.template = template;

    const config = template.template_config;

    // Créer le document PDF
    this.doc = new jsPDF({
      orientation: config.layout.orientation || 'landscape',
      unit: 'mm',
      format: config.layout.format || 'a4',
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Générer le PDF complet
   */
  generate(): jsPDF {
    const elements = this.template.template_config.elements;

    // Dessiner chaque élément dans l'ordre
    elements.forEach((element) => {
      // Vérifier la condition si elle existe
      if (element.condition && !this.checkCondition(element.condition)) {
        return; // Skip cet élément
      }

      this.renderElement(element);
    });

    return this.doc;
  }

  /**
   * Vérifier une condition (ex: "grade" pour afficher seulement si grade existe)
   */
  private checkCondition(condition: string): boolean {
    const data: any = this.certificate;
    const value = data[condition];
    return value !== null && value !== undefined && value !== '';
  }

  /**
   * Remplacer les variables dynamiques dans un texte
   */
  private replaceVariables(text: string): string {
    // Construire l'objet des variables
    const variables: Record<string, any> = {
      '{student_name}': this.certificate.student_name || 'Étudiant',
      '{student_email}': this.certificate.student_email || '',
      '{formation_title}': this.certificate.formation_title || 'Formation',
      '{formation_description}': this.certificate.formation_description || '',
      '{duration_hours}': this.certificate.duration_hours || '',
      '{completion_date}': this.formatDate(this.certificate.completion_date, 'long'),
      '{completion_date_short}': this.formatDate(this.certificate.completion_date, 'short'),
      '{issued_date}': this.formatDate(this.certificate.issued_at, 'long'),
      '{issued_date_short}': this.formatDate(this.certificate.issued_at, 'short'),
      '{certificate_number}': this.certificate.certificate_number || '',
      '{grade}': this.certificate.grade !== null && this.certificate.grade !== undefined ? this.certificate.grade : '',
      '{grade_rounded}':
        this.certificate.grade !== null && this.certificate.grade !== undefined
          ? Math.round(this.certificate.grade)
          : '',
      '{current_year}': new Date().getFullYear(),
      '{current_date}': this.formatDate(new Date(), 'long'),
      '{organization_name}':
        (this.certificate.metadata as any)?.organization_name || 'Centre de Formation',
      '{organization_address}': (this.certificate.metadata as any)?.organization_address || '',
      '{director_name}': (this.certificate.metadata as any)?.director_name || 'Directeur',
      '{logo_url}': (this.certificate.metadata as any)?.logo_url || '',
      '{signature_url}': (this.certificate.metadata as any)?.signature_url || '',
    };

    let result = text;

    // Remplacer toutes les variables
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), String(value || ''));
    });

    return result;
  }

  /**
   * Calculer une position (supporte "center", "pageWidth - 20", etc.)
   */
  private calculatePosition(expression: string | number, context: 'x' | 'y' = 'x'): number {
    if (typeof expression === 'number') {
      return expression;
    }

    // Remplacer les mots-clés
    let expr = expression
      .replace(/pageWidth/g, String(this.pageWidth))
      .replace(/pageHeight/g, String(this.pageHeight))
      .replace(
        /center/g,
        context === 'x' ? String(this.pageWidth / 2) : String(this.pageHeight / 2)
      );

    // Calculer nameWidth si nécessaire (pour les lignes sous le nom)
    if (expr.includes('nameWidth')) {
      const nameWidth = this.doc.getTextWidth(this.certificate.student_name || 'Étudiant');
      expr = expr.replace(/nameWidth/g, String(nameWidth));
    }

    // Évaluer l'expression mathématique de manière sécurisée
    try {
      // Nettoyer l'expression (autoriser seulement chiffres, opérateurs, parenthèses)
      if (!/^[\d\s+\-*/().]+$/.test(expr)) {
        console.warn('Expression non valide:', expr);
        return 0;
      }
      // eslint-disable-next-line no-new-func
      return Function(`'use strict'; return (${expr})`)();
    } catch (error) {
      console.error('Error calculating position:', expr, error);
      return 0;
    }
  }

  /**
   * Obtenir une couleur depuis la config ou depuis un hex direct
   */
  private getColor(colorKey: string): [number, number, number] {
    const colors = this.template.template_config.colors;

    // Si c'est une clé de couleur (primary, secondary, etc.)
    const colorValue = colors[colorKey] || colorKey;

    // Si c'est un hex, convertir en RGB
    if (colorValue.startsWith('#')) {
      return this.hexToRgb(colorValue);
    }

    // Sinon retourner noir par défaut
    return [0, 0, 0];
  }

  /**
   * Convertir hex en RGB
   */
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  }

  /**
   * Formater une date
   */
  private formatDate(dateString: string | Date, format: 'long' | 'short'): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }

      if (format === 'long') {
        return date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      } else {
        return date.toLocaleDateString('fr-FR');
      }
    } catch {
      return '';
    }
  }

  /**
   * Dessiner un élément selon son type
   */
  private renderElement(element: TemplateElement): void {
    try {
      switch (element.type) {
        case 'text':
          this.renderText(element);
          break;
        case 'line':
          this.renderLine(element);
          break;
        case 'border':
        case 'rectangle':
          this.renderRectangle(element);
          break;
        case 'circle':
          this.renderCircle(element);
          break;
        case 'image':
          this.renderImage(element);
          break;
        default:
          console.warn('Unknown element type:', element.type);
      }
    } catch (error) {
      console.error('Error rendering element:', element.id, error);
    }
  }

  /**
   * Dessiner un texte
   */
  private renderText(element: TemplateElement): void {
    // Récupérer la config de police
    const fontConfig: TemplateFont = element.font
      ? this.template.template_config.fonts[element.font]
      : { family: 'helvetica', size: 12, style: 'normal', color: 'text' };

    // Appliquer la police
    const fontFamily = element.fontFamily || fontConfig.family;
    const fontStyle = element.fontStyle || fontConfig.style;
    const fontSize = element.fontSize || fontConfig.size;

    this.doc.setFont(fontFamily, fontStyle);
    this.doc.setFontSize(fontSize);

    // Appliquer la couleur
    const color = element.color
      ? this.getColor(element.color)
      : this.getColor(fontConfig.color || 'text');
    this.doc.setTextColor(...color);

    // Remplacer les variables
    const text = this.replaceVariables(element.content || '');

    // Calculer la position
    const x = this.calculatePosition(element.x || 0, 'x');
    const y = this.calculatePosition(element.y || 0, 'y');

    // Gérer le maxWidth (retour à la ligne automatique)
    if (element.maxWidth) {
      const maxWidth = this.calculatePosition(element.maxWidth, 'x');
      const lines = this.doc.splitTextToSize(text, maxWidth);

      if (lines.length === 1) {
        this.doc.text(lines[0], x, y, { align: element.align || 'left' });
      } else {
        // Afficher plusieurs lignes avec un espacement
        lines.forEach((line: string, index: number) => {
          this.doc.text(line, x, y + index * 7, { align: element.align || 'left' });
        });
      }
    } else {
      this.doc.text(text, x, y, { align: element.align || 'left' });
    }
  }

  /**
   * Dessiner une ligne
   */
  private renderLine(element: TemplateElement): void {
    const x1 = this.calculatePosition(element.x1 || 0, 'x');
    const y1 = this.calculatePosition(element.y1 || 0, 'y');
    const x2 = this.calculatePosition(element.x2 || 0, 'x');
    const y2 = this.calculatePosition(element.y2 || 0, 'y');

    const color = this.getColor(element.color || 'text');
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(element.lineWidth || 0.5);
    this.doc.line(x1, y1, x2, y2);
  }

  /**
   * Dessiner un rectangle (bordure)
   */
  private renderRectangle(element: TemplateElement): void {
    const x = this.calculatePosition(element.x || 0, 'x');
    const y = this.calculatePosition(element.y || 0, 'y');
    const width = this.calculatePosition(element.width || 0, 'x');
    const height = this.calculatePosition(element.height || 0, 'y');

    const color = this.getColor(element.color || 'secondary');
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(element.lineWidth || 1);

    // Dessiner le rectangle
    this.doc.rect(x, y, width, height);
  }

  /**
   * Dessiner un cercle
   */
  private renderCircle(element: TemplateElement): void {
    const x = this.calculatePosition(element.x || 0, 'x');
    const y = this.calculatePosition(element.y || 0, 'y');
    const radius = element.radius || 10;

    // Couleur de remplissage
    const fillColor = this.getColor(element.fillColor || 'secondary');
    this.doc.setFillColor(...fillColor);

    // Dessiner le cercle rempli
    this.doc.circle(x, y, radius, 'F');
  }

  /**
   * Dessiner une image (logo, signature)
   * NOTE: Non implémenté dans cette version - nécessite chargement asynchrone d'images
   */
  private renderImage(_element: TemplateElement): void {
    // TODO: Implémenter le chargement et l'affichage d'images
    // Nécessite conversion en base64 ou chargement d'URL
    console.warn('Image rendering not yet implemented');
  }

  /**
   * Télécharger le PDF
   */
  download(): void {
    const filename = `certificat_${this.certificate.certificate_number}_${
      this.certificate.student_name?.replace(/\s+/g, '_') || 'etudiant'
    }.pdf`;
    this.doc.save(filename);
  }

  /**
   * Obtenir le blob PDF (pour prévisualisation)
   */
  getBlob(): Blob {
    return this.doc.output('blob');
  }

  /**
   * Obtenir le data URL (base64)
   */
  getDataURL(): string {
    return this.doc.output('dataurlstring');
  }
}

/**
 * Fonction principale pour générer et télécharger un certificat
 */
export const generateCertificateFromTemplate = (
  certificate: Certificate,
  template: CertificateTemplate
): void => {
  const engine = new CertificateTemplateEngine(certificate, template);
  engine.generate();
  engine.download();
};

/**
 * Fonction pour générer un aperçu PDF (retourne un Blob)
 */
export const generateCertificatePreviewFromTemplate = (
  certificate: Certificate,
  template: CertificateTemplate
): Blob => {
  const engine = new CertificateTemplateEngine(certificate, template);
  engine.generate();
  return engine.getBlob();
};

/**
 * Fonction pour générer des données de test pour la prévisualisation
 */
export const generateTestCertificateData = (): Certificate => {
  return {
    id: 'test-id',
    student_id: 'test-student',
    formation_id: 'test-formation',
    student_name: 'Jean Dupont',
    student_email: 'jean.dupont@example.com',
    formation_title: 'Formation Avancée en Développement Web',
    formation_description: 'Maîtrise complète du développement web moderne',
    duration_hours: 120,
    certificate_number: 'CERT-202501-ABC123',
    issued_at: new Date().toISOString(),
    completion_date: new Date().toISOString(),
    grade: 85.5,
    metadata: {
      organization_name: 'Centre de Formation Excellence',
      organization_address: '123 Rue de la Formation, Paris',
      director_name: 'Marie Martin',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Certificate;
};
