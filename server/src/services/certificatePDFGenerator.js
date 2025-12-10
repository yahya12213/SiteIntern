import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base paths
const UPLOADS_BASE = process.env.UPLOADS_PATH || path.join(__dirname, '../../uploads');

/**
 * Certificate PDF Generator Service
 * Generates PDF certificates using PDFKit based on templates
 */
export class CertificatePDFGenerator {
  /**
   * Generates a certificate PDF file
   * @param {Object} certificate - Certificate data
   * @param {Object} template - Certificate template configuration
   * @param {string} outputPath - Full path where to save the PDF
   * @returns {Promise<string>} - Path to generated PDF
   */
  async generateCertificate(certificate, template, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const templateConfig = template.template_config || {};
        const layout = templateConfig.layout || {};

        // Determine PDF format and orientation
        const format = layout.format || 'a4';
        const orientation = layout.orientation || 'landscape';

        // Create PDF document
        const doc = new PDFDocument({
          size: format.toUpperCase(),
          layout: orientation,
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });

        // Create write stream
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Render background if exists
        if (template.background_image_url) {
          try {
            const bgPath = path.join(UPLOADS_BASE, template.background_image_url);
            if (fs.existsSync(bgPath)) {
              doc.image(bgPath, 0, 0, {
                width: doc.page.width,
                height: doc.page.height
              });
            }
          } catch (bgError) {
            console.warn('Error loading background image:', bgError);
          }
        }

        // Render template elements or use default template
        if (templateConfig.pages && templateConfig.pages.length > 0) {
          this.renderTemplateElements(doc, certificate, templateConfig);
        } else {
          this.renderDefaultCertificate(doc, certificate);
        }

        // Finalize PDF
        doc.end();

        // Wait for write to complete
        stream.on('finish', () => {
          resolve(outputPath);
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Renders template elements on the PDF
   * @param {PDFDocument} doc - PDF document
   * @param {Object} certificate - Certificate data
   * @param {Object} templateConfig - Template configuration
   */
  renderTemplateElements(doc, certificate, templateConfig) {
    const pages = templateConfig.pages || [];
    const colors = templateConfig.colors || {};
    const fonts = templateConfig.fonts || {};

    // Render first page (we'll support multi-page later)
    if (pages.length > 0) {
      const page = pages[0];
      const elements = page.elements || [];

      elements.forEach(element => {
        try {
          switch (element.type) {
            case 'text':
              this.renderTextElement(doc, element, certificate, fonts);
              break;
            case 'line':
              this.renderLineElement(doc, element, colors);
              break;
            case 'rectangle':
              this.renderRectangleElement(doc, element, colors);
              break;
            case 'circle':
              this.renderCircleElement(doc, element, colors);
              break;
            case 'image':
              this.renderImageElement(doc, element);
              break;
            default:
              console.warn(`Unknown element type: ${element.type}`);
          }
        } catch (elementError) {
          console.error(`Error rendering element ${element.type}:`, elementError);
        }
      });
    }
  }

  /**
   * Renders a text element
   * @param {PDFDocument} doc - PDF document
   * @param {Object} element - Text element configuration
   * @param {Object} certificate - Certificate data
   * @param {Object} fonts - Font configurations
   */
  renderTextElement(doc, element, certificate, fonts) {
    const content = this.substituteVariables(element.content || '', certificate);
    const x = this.resolvePosition(element.x, doc.page.width);
    const y = this.resolvePosition(element.y, doc.page.height);
    const fontSize = element.fontSize || 12;
    const color = element.color || '#000000';
    const align = element.align || 'left';

    // Set font (PDFKit has limited font support, we'll use built-in fonts)
    doc.font(this.resolveFont(element.font || 'Helvetica'));

    // Set font size and color
    doc.fontSize(fontSize);
    doc.fillColor(color);

    // Render text
    if (align === 'center') {
      doc.text(content, x - 200, y, {
        width: 400,
        align: 'center'
      });
    } else if (align === 'right') {
      doc.text(content, x - 400, y, {
        width: 400,
        align: 'right'
      });
    } else {
      doc.text(content, x, y, {
        align: 'left'
      });
    }
  }

  /**
   * Renders a line element
   * @param {PDFDocument} doc - PDF document
   * @param {Object} element - Line element configuration
   * @param {Object} colors - Color configurations
   */
  renderLineElement(doc, element, colors) {
    const x1 = this.resolvePosition(element.x1, doc.page.width);
    const y1 = this.resolvePosition(element.y1, doc.page.height);
    const x2 = this.resolvePosition(element.x2, doc.page.width);
    const y2 = this.resolvePosition(element.y2, doc.page.height);
    const strokeWidth = element.strokeWidth || 1;
    const strokeColor = element.strokeColor || '#000000';

    doc.strokeColor(strokeColor);
    doc.lineWidth(strokeWidth);
    doc.moveTo(x1, y1);
    doc.lineTo(x2, y2);
    doc.stroke();
  }

  /**
   * Renders a rectangle element
   * @param {PDFDocument} doc - PDF document
   * @param {Object} element - Rectangle element configuration
   * @param {Object} colors - Color configurations
   */
  renderRectangleElement(doc, element, colors) {
    const x = this.resolvePosition(element.x, doc.page.width);
    const y = this.resolvePosition(element.y, doc.page.height);
    const width = element.width || 100;
    const height = element.height || 100;
    const fillColor = element.fillColor;
    const strokeColor = element.strokeColor;
    const strokeWidth = element.strokeWidth || 1;

    if (fillColor) {
      doc.fillColor(fillColor);
      doc.rect(x, y, width, height).fill();
    }

    if (strokeColor) {
      doc.strokeColor(strokeColor);
      doc.lineWidth(strokeWidth);
      doc.rect(x, y, width, height).stroke();
    }
  }

  /**
   * Renders a circle element
   * @param {PDFDocument} doc - PDF document
   * @param {Object} element - Circle element configuration
   * @param {Object} colors - Color configurations
   */
  renderCircleElement(doc, element, colors) {
    const x = this.resolvePosition(element.x, doc.page.width);
    const y = this.resolvePosition(element.y, doc.page.height);
    const radius = element.radius || 50;
    const fillColor = element.fillColor;
    const strokeColor = element.strokeColor;
    const strokeWidth = element.strokeWidth || 1;

    if (fillColor) {
      doc.fillColor(fillColor);
      doc.circle(x, y, radius).fill();
    }

    if (strokeColor) {
      doc.strokeColor(strokeColor);
      doc.lineWidth(strokeWidth);
      doc.circle(x, y, radius).stroke();
    }
  }

  /**
   * Renders an image element
   * @param {PDFDocument} doc - PDF document
   * @param {Object} element - Image element configuration
   */
  renderImageElement(doc, element) {
    try {
      if (element.src) {
        const imagePath = path.join(UPLOADS_BASE, element.src);
        if (fs.existsSync(imagePath)) {
          const x = this.resolvePosition(element.x, doc.page.width);
          const y = this.resolvePosition(element.y, doc.page.height);
          const width = element.width || 100;
          const height = element.height || 100;

          doc.image(imagePath, x, y, { width, height });
        }
      }
    } catch (imageError) {
      console.error('Error rendering image:', imageError);
    }
  }

  /**
   * Renders default certificate template (fallback)
   * @param {PDFDocument} doc - PDF document
   * @param {Object} certificate - Certificate data
   */
  renderDefaultCertificate(doc, certificate) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Draw border
    doc.strokeColor('#3B82F6');
    doc.lineWidth(3);
    doc.rect(30, 30, pageWidth - 60, pageHeight - 60).stroke();

    // Draw inner border
    doc.strokeColor('#FBBF24');
    doc.lineWidth(1);
    doc.rect(40, 40, pageWidth - 80, pageHeight - 80).stroke();

    // Title
    doc.font('Helvetica-Bold');
    doc.fontSize(36);
    doc.fillColor('#3B82F6');
    doc.text('CERTIFICAT DE RÉUSSITE', 0, 100, {
      width: pageWidth,
      align: 'center'
    });

    // Student name
    doc.font('Times-Roman');
    doc.fontSize(24);
    doc.fillColor('#1F2937');
    doc.text('Décerné à', 0, 180, {
      width: pageWidth,
      align: 'center'
    });

    doc.font('Times-Bold');
    doc.fontSize(32);
    doc.fillColor('#000000');
    doc.text(certificate.student_name || 'Étudiant', 0, 220, {
      width: pageWidth,
      align: 'center'
    });

    // Formation title
    doc.font('Helvetica');
    doc.fontSize(18);
    doc.fillColor('#1F2937');
    doc.text('Pour avoir réussi la formation', 0, 280, {
      width: pageWidth,
      align: 'center'
    });

    doc.font('Helvetica-Bold');
    doc.fontSize(22);
    doc.fillColor('#3B82F6');
    doc.text(certificate.formation_title || 'Formation', 0, 310, {
      width: pageWidth,
      align: 'center'
    });

    // Completion date and grade
    doc.font('Helvetica');
    doc.fontSize(14);
    doc.fillColor('#4B5563');
    const completionDate = certificate.completion_date ? new Date(certificate.completion_date).toLocaleDateString('fr-FR') : '';
    doc.text(`Complété le ${completionDate}`, 0, 370, {
      width: pageWidth,
      align: 'center'
    });

    if (certificate.grade) {
      doc.text(`Note obtenue: ${Math.round(certificate.grade)}%`, 0, 395, {
        width: pageWidth,
        align: 'center'
      });
    }

    // Certificate number
    doc.font('Helvetica');
    doc.fontSize(10);
    doc.fillColor('#9CA3AF');
    doc.text(`N° de certificat: ${certificate.certificate_number}`, 0, pageHeight - 60, {
      width: pageWidth,
      align: 'center'
    });

    // Signature line
    doc.strokeColor('#000000');
    doc.lineWidth(1);
    doc.moveTo(pageWidth / 2 - 100, pageHeight - 100);
    doc.lineTo(pageWidth / 2 + 100, pageHeight - 100);
    doc.stroke();

    doc.font('Helvetica');
    doc.fontSize(12);
    doc.fillColor('#000000');
    doc.text('Signature', pageWidth / 2 - 100, pageHeight - 85, {
      width: 200,
      align: 'center'
    });
  }

  /**
   * Substitutes variables in text with certificate data
   * @param {string} text - Text with variables
   * @param {Object} certificate - Certificate data
   * @returns {string} - Text with substituted values
   */
  substituteVariables(text, certificate) {
    const metadata = certificate.metadata || {};

    const variables = {
      '{student_name}': certificate.student_name || '',
      '{student_first_name}': metadata.prenom || metadata.student_first_name || '',
      '{student_last_name}': metadata.nom || metadata.student_last_name || '',
      '{formation_title}': certificate.formation_title || '',
      '{completion_date}': certificate.completion_date ? new Date(certificate.completion_date).toLocaleDateString('fr-FR') : '',
      '{certificate_number}': certificate.certificate_number || '',
      '{grade}': certificate.grade ? certificate.grade.toFixed(1) : '',
      '{grade_rounded}': certificate.grade ? Math.round(certificate.grade).toString() : '',
      '{duration_hours}': certificate.duration_hours || '',
      '{current_year}': new Date().getFullYear().toString(),
      '{organization_name}': metadata.organization_name || '',
      '{director_name}': metadata.director_name || '',
      '{cin}': metadata.cin || metadata.student_id || ''
    };

    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  /**
   * Resolves position (handles 'center', numbers, and expressions)
   * @param {string|number} position - Position value
   * @param {number} dimension - Page dimension (width or height)
   * @returns {number} - Resolved position in pixels
   */
  resolvePosition(position, dimension) {
    if (position === 'center') {
      return dimension / 2;
    }

    if (typeof position === 'number') {
      return position;
    }

    if (typeof position === 'string') {
      // Handle expressions like "width / 2" or "height - 100"
      try {
        const expr = position.replace(/width/g, dimension.toString()).replace(/height/g, dimension.toString());
        return eval(expr);
      } catch {
        return parseFloat(position) || 0;
      }
    }

    return 0;
  }

  /**
   * Resolves font name to PDFKit built-in font
   * @param {string} fontName - Font name
   * @returns {string} - PDFKit font name
   */
  resolveFont(fontName) {
    const fontMap = {
      'Helvetica': 'Helvetica',
      'Helvetica-Bold': 'Helvetica-Bold',
      'Times': 'Times-Roman',
      'Times-Roman': 'Times-Roman',
      'Times-Bold': 'Times-Bold',
      'Courier': 'Courier',
      'Arial': 'Helvetica',  // Fallback
      'Verdana': 'Helvetica',  // Fallback
      'Georgia': 'Times-Roman',  // Fallback
    };

    return fontMap[fontName] || 'Helvetica';
  }
}

export default CertificatePDFGenerator;
