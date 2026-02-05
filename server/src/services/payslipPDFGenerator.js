/**
 * Payslip PDF Generator Service
 * Generates bulletin de paie PDFs with segment logo
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base paths
const UPLOADS_BASE = process.env.UPLOADS_PATH || path.join(__dirname, '../../uploads');

export class PayslipPDFGenerator {
  /**
   * Generate payslip PDF
   * @param {string} payslipId - UUID of payslip
   * @param {string} outputPath - Path to save PDF
   * @returns {Promise<string>} Path to generated PDF
   */
  async generatePayslip(payslipId, outputPath) {
    const client = await pool.connect();

    try {
      // 1. Récupérer les données du bulletin
      const payslipResult = await client.query(`
        SELECT
          ps.*,
          e.first_name, e.last_name, e.employee_number, e.cin, e.hire_date,
          e.department, e.position, e.email, e.phone,
          s.name as segment_name, s.logo_url as segment_logo,
          p.name as period_name, p.year, p.month, p.start_date, p.end_date, p.pay_date
        FROM hr_payslips ps
        JOIN hr_employees e ON e.id = ps.employee_id
        LEFT JOIN segments s ON e.segment_id = s.id
        JOIN hr_payroll_periods p ON p.id = ps.period_id
        WHERE ps.id = $1
      `, [payslipId]);

      if (payslipResult.rows.length === 0) {
        throw new Error('Payslip not found');
      }

      const payslip = payslipResult.rows[0];

      // 2. Récupérer les lignes de détail
      const linesResult = await client.query(`
        SELECT * FROM hr_payslip_lines
        WHERE payslip_id = $1
        ORDER BY display_order
      `, [payslipId]);

      const lines = linesResult.rows;

      // 3. Créer le PDF
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // 4. En-tête avec logo du segment
      let yPosition = 50;

      if (payslip.segment_logo) {
        try {
          // Construct logo path
          const logoPath = path.join(UPLOADS_BASE, 'segments', path.basename(payslip.segment_logo));
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, yPosition, { width: 100 });
          }
        } catch (err) {
          console.warn('Could not load segment logo:', err);
        }
      }

      // Nom de l'entreprise / segment
      doc.fontSize(12).font('Helvetica-Bold')
        .text(payslip.segment_name || 'PROLEAN', 450, yPosition, { align: 'right' });
      yPosition += 80;

      // 5. Titre
      doc.fontSize(18).font('Helvetica-Bold')
        .text('BULLETIN DE PAIE', 50, yPosition, { align: 'center' });
      yPosition += 30;

      // Format dates
      const formatDate = (date) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR');
      };

      doc.fontSize(10).font('Helvetica')
        .text(`Période : ${payslip.period_name} (${formatDate(payslip.start_date)} au ${formatDate(payslip.end_date)})`,
          50, yPosition, { align: 'center' });
      yPosition += 40;

      // 6. Informations employé
      doc.fontSize(11).font('Helvetica-Bold').text('INFORMATIONS EMPLOYÉ', 50, yPosition);
      yPosition += 20;

      doc.fontSize(9).font('Helvetica');
      doc.text(`Nom et prénom : ${payslip.first_name} ${payslip.last_name}`, 50, yPosition);
      doc.text(`Matricule : ${payslip.employee_number || 'N/A'}`, 350, yPosition);
      yPosition += 15;

      doc.text(`Poste : ${payslip.position || 'N/A'}`, 50, yPosition);
      doc.text(`Département : ${payslip.department || 'N/A'}`, 350, yPosition);
      yPosition += 15;

      doc.text(`Date d'embauche : ${formatDate(payslip.hire_date)}`, 50, yPosition);
      doc.text(`CIN : ${payslip.cin || 'N/A'}`, 350, yPosition);
      yPosition += 30;

      // 7. Lignes de détail - Gains
      const earnings = lines.filter(l => l.line_type === 'earning');
      const deductions = lines.filter(l => l.line_type === 'deduction');

      if (earnings.length > 0) {
        doc.fontSize(11).font('Helvetica-Bold').text('GAINS', 50, yPosition);
        yPosition += 20;

        doc.fontSize(9).font('Helvetica');
        earnings.forEach(line => {
          doc.text(line.label, 60, yPosition);
          doc.text(`${parseFloat(line.amount).toFixed(2)} MAD`, 450, yPosition, { align: 'right' });
          yPosition += 15;
        });

        yPosition += 10;
      }

      // 8. Lignes de détail - Retenues
      if (deductions.length > 0) {
        doc.fontSize(11).font('Helvetica-Bold').text('RETENUES', 50, yPosition);
        yPosition += 20;

        doc.fontSize(9).font('Helvetica');
        deductions.forEach(line => {
          doc.text(line.label, 60, yPosition);
          doc.text(`${parseFloat(line.amount).toFixed(2)} MAD`, 450, yPosition, { align: 'right' });
          yPosition += 15;
        });

        yPosition += 20;
      }

      // 9. Totaux
      doc.moveTo(50, yPosition).lineTo(545, yPosition).stroke();
      yPosition += 10;

      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Salaire Brut :', 50, yPosition);
      doc.text(`${parseFloat(payslip.gross_salary).toFixed(2)} MAD`, 450, yPosition, { align: 'right' });
      yPosition += 20;

      doc.text('Total Retenues :', 50, yPosition);
      doc.text(`${parseFloat(payslip.total_deductions).toFixed(2)} MAD`, 450, yPosition, { align: 'right' });
      yPosition += 20;

      doc.fontSize(14);
      doc.text('NET À PAYER :', 50, yPosition);
      doc.text(`${parseFloat(payslip.net_salary).toFixed(2)} MAD`, 450, yPosition, { align: 'right' });
      yPosition += 40;

      // 10. Informations bancaires (si disponibles)
      if (payslip.bank_name || payslip.bank_account) {
        doc.fontSize(9).font('Helvetica');
        doc.text('Mode de paiement : Virement bancaire', 50, yPosition);
        yPosition += 15;
        if (payslip.bank_name) {
          doc.text(`Banque : ${payslip.bank_name}`, 50, yPosition);
          yPosition += 15;
        }
        if (payslip.rib) {
          doc.text(`RIB : ${payslip.rib}`, 50, yPosition);
          yPosition += 15;
        }
        yPosition += 20;
      }

      // 11. Pied de page
      doc.fontSize(8).font('Helvetica').fillColor('#666666');
      doc.text(
        `Généré le ${new Date().toLocaleDateString('fr-FR')} - Document confidentiel`,
        50, 750,
        { align: 'center' }
      );

      // Finaliser
      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
      });

    } finally {
      client.release();
    }
  }

  /**
   * Generate multiple payslip PDFs
   * @param {string[]} payslipIds - Array of payslip IDs
   * @param {string} outputDir - Directory to save PDFs
   * @returns {Promise<string[]>} Array of generated PDF paths
   */
  async generateMultiplePayslips(payslipIds, outputDir) {
    const results = [];

    for (const payslipId of payslipIds) {
      try {
        const outputPath = path.join(outputDir, `bulletin-${payslipId}.pdf`);
        await this.generatePayslip(payslipId, outputPath);
        results.push(outputPath);
      } catch (error) {
        console.error(`Error generating payslip ${payslipId}:`, error);
        results.push(null);
      }
    }

    return results;
  }
}
