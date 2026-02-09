/**
 * Payslip PDF Generator Service
 * Generates professional bulletin de paie PDFs
 * Design: Professional layout with company header, employee section, pay table, leave tracking
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

// Colors
const COLORS = {
  primary: '#2c3e50',      // Bleu nuit professionnel
  accent: '#27ae60',       // Vert pour net à payer
  text: '#333333',
  textLight: '#7f8c8d',
  line: '#bdc3c7',
  background: '#f8f9fa',
  gain: '#2c3e50',
  retenue: '#c0392b',
  white: '#ffffff'
};

export class PayslipPDFGenerator {
  /**
   * Format amount with spaces as thousands separator
   */
  formatAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      const parsed = parseFloat(amount);
      if (isNaN(parsed)) return '0,00';
      amount = parsed;
    }
    return amount.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /**
   * Format date to French format
   */
  formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR');
  }

  /**
   * Calculate years of seniority
   */
  calculateSeniority(hireDate) {
    if (!hireDate) return 0;
    const hire = new Date(hireDate);
    const now = new Date();
    const years = Math.floor((now - hire) / (365.25 * 24 * 60 * 60 * 1000));
    return years;
  }

  /**
   * Generate payslip PDF with professional design
   */
  async generatePayslip(payslipId, outputPath) {
    const client = await pool.connect();

    try {
      // 1. Récupérer les données avec infos fiscales segment
      const payslipResult = await client.query(`
        SELECT
          ps.*,
          e.first_name, e.last_name, e.employee_number, e.cin, e.hire_date,
          e.department, e.position, e.email, e.phone,
          e.social_security_number as employee_cnss, e.employment_type, e.termination_date,
          e.marital_status, e.dependent_children, e.initial_leave_balance,
          s.name as segment_name, s.logo_url as segment_logo, s.cnss_number as segment_cnss,
          s.identifiant_fiscal, s.registre_commerce, s.ice, s.company_address,
          p.name as period_name, p.year, p.month, p.start_date, p.end_date, p.pay_date,
          lb.current_balance as leave_balance,
          lb.accrued as leave_accrued,
          lb.taken as leave_taken,
          COALESCE(
            (SELECT current_balance FROM hr_leave_balances
             WHERE employee_id = e.id AND year = p.year - 1
             ORDER BY created_at DESC LIMIT 1),
            e.initial_leave_balance,
            0
          ) as leave_previous_balance
        FROM hr_payslips ps
        JOIN hr_employees e ON e.id = ps.employee_id
        LEFT JOIN segments s ON e.segment_id = s.id
        JOIN hr_payroll_periods p ON p.id = ps.period_id
        LEFT JOIN hr_leave_types lt ON lt.code = 'ANNUAL'
        LEFT JOIN hr_leave_balances lb ON lb.employee_id = e.id AND lb.leave_type_id = lt.id AND lb.year = p.year
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

      // 3. Créer le PDF A4
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 }
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const pageWidth = 595.28;  // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      const marginLeft = 40;
      const marginRight = 40;
      const contentWidth = pageWidth - marginLeft - marginRight;

      // =====================================================
      // WATERMARK (fond)
      // =====================================================
      const watermarkText = payslip.segment_name || 'PROLEAN';
      doc.save();
      doc.rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] });
      doc.fontSize(100).fillColor('#000000').opacity(0.03);
      doc.text(watermarkText, 0, pageHeight / 2, { align: 'center', width: pageWidth * 1.5 });
      doc.restore();
      doc.opacity(1);

      // =====================================================
      // HEADER SECTION
      // =====================================================
      let y = 40;

      // Logo et infos entreprise (gauche)
      let logoEndX = marginLeft;
      if (payslip.segment_logo) {
        try {
          const logoPath = path.join(UPLOADS_BASE, 'segments', path.basename(payslip.segment_logo));
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, marginLeft, y, { height: 50 });
            logoEndX = marginLeft + 60;
          }
        } catch (err) {
          console.warn('Could not load segment logo:', err);
        }
      }

      // Nom entreprise (style vert comme dans le modèle)
      const companyName = (payslip.segment_name || 'PROLEAN').toUpperCase();
      doc.fontSize(24).font('Helvetica-Bold').fillColor(COLORS.accent);
      doc.text(payslip.segment_name || 'PROLEAN', logoEndX + 5, y);

      doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.primary);
      doc.text(`${companyName} SARL`, logoEndX + 5, y + 28);

      // Adresse et infos légales
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.textLight);
      let companyY = y + 45;
      if (payslip.company_address) {
        doc.text(payslip.company_address, logoEndX + 5, companyY);
        companyY += 12;
      }

      // RC, IF, ICE, CNSS sur une ligne
      let legalInfo = [];
      if (payslip.registre_commerce) legalInfo.push(`RC: ${payslip.registre_commerce}`);
      if (payslip.identifiant_fiscal) legalInfo.push(`IF: ${payslip.identifiant_fiscal}`);
      if (payslip.ice) legalInfo.push(`ICE: ${payslip.ice}`);
      if (payslip.segment_cnss) legalInfo.push(`CNSS: ${payslip.segment_cnss}`);

      if (legalInfo.length > 0) {
        doc.text(legalInfo.slice(0, 2).join(' | '), logoEndX + 5, companyY);
        if (legalInfo.length > 2) {
          companyY += 12;
          doc.text(legalInfo.slice(2).join(' | '), logoEndX + 5, companyY);
        }
      }

      // BULLETIN DE PAIE (droite)
      doc.fontSize(22).font('Helvetica-Bold').fillColor(COLORS.primary);
      doc.text('BULLETIN DE PAIE', 350, y, { align: 'right', width: contentWidth - 310 });

      // Période (avec boîte)
      const periodBoxY = y + 35;
      doc.fontSize(10).font('Helvetica').fillColor(COLORS.text);
      doc.text('Période de paie:', 350, periodBoxY, { align: 'right', width: 120 });

      // Boîte période
      const periodText = `${this.formatDate(payslip.start_date)} au ${this.formatDate(payslip.end_date)}`;
      doc.roundedRect(470, periodBoxY - 5, 115, 22, 3)
        .fill(COLORS.background);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary);
      doc.text(periodText, 475, periodBoxY, { width: 105, align: 'center' });

      // Date de paiement
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.textLight);
      doc.text(`Date de paiement: ${this.formatDate(payslip.pay_date)}`, 350, periodBoxY + 22, { align: 'right', width: 235 });

      // Ligne de séparation header
      y = 115;
      doc.strokeColor(COLORS.primary).lineWidth(2);
      doc.moveTo(marginLeft, y).lineTo(pageWidth - marginRight, y).stroke();

      // =====================================================
      // EMPLOYEE SECTION
      // =====================================================
      y += 15;

      // Fond gris clair avec bordure gauche colorée
      doc.rect(marginLeft, y, contentWidth, 75).fill(COLORS.background);
      doc.rect(marginLeft, y, 5, 75).fill(COLORS.primary);

      // Mapping type de contrat
      const contractTypeLabels = {
        'full_time': 'CDI',
        'part_time': 'Temps partiel',
        'intern': 'Stagiaire',
        'freelance': 'Freelance',
        'temporary': 'CDD'
      };
      const contractType = contractTypeLabels[payslip.employment_type] || payslip.employment_type || 'N/A';

      const seniority = this.calculateSeniority(payslip.hire_date);

      // 3 colonnes
      const col1X = marginLeft + 15;
      const col2X = marginLeft + 180;
      const col3X = marginLeft + 360;
      let empY = y + 10;

      doc.fontSize(9).font('Helvetica');

      // Colonne 1
      this.drawLabelValue(doc, 'Matricule:', payslip.employee_number || 'N/A', col1X, empY);
      empY += 15;
      this.drawLabelValue(doc, 'Nom:', (payslip.last_name || '').toUpperCase(), col1X, empY);
      empY += 15;
      this.drawLabelValue(doc, 'Prénom:', payslip.first_name || 'N/A', col1X, empY);

      // Colonne 2
      empY = y + 10;
      this.drawLabelValue(doc, 'Fonction:', payslip.position || 'N/A', col2X, empY);
      empY += 15;
      this.drawLabelValue(doc, 'Statut:', contractType, col2X, empY);
      empY += 15;
      this.drawLabelValue(doc, 'Département:', payslip.department || payslip.segment_name || 'N/A', col2X, empY);

      // Colonne 3
      empY = y + 10;
      this.drawLabelValue(doc, 'Embauche:', this.formatDate(payslip.hire_date), col3X, empY);
      empY += 15;
      this.drawLabelValue(doc, 'Ancienneté:', `${seniority} an${seniority > 1 ? 's' : ''}`, col3X, empY);
      empY += 15;
      this.drawLabelValue(doc, 'N° CNSS:', payslip.employee_cnss || 'N/A', col3X, empY);
      empY += 15;
      this.drawLabelValue(doc, 'CIN:', payslip.cin || 'N/A', col3X, empY);

      y += 90;

      // =====================================================
      // PAY TABLE
      // =====================================================

      // Table header
      const tableX = marginLeft;
      const colWidths = [200, 80, 60, 85, 85]; // Rubrique, Base/Nombre, Taux, Gains, Retenues

      doc.rect(tableX, y, contentWidth, 25).fill(COLORS.primary);

      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.white);
      let headerX = tableX + 8;
      const headers = ['RUBRIQUE', 'BASE / NOMBRE', 'TAUX', 'GAINS (+)', 'RETENUES (-)'];
      const headerAligns = ['left', 'right', 'center', 'right', 'right'];

      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], headerX, y + 8, { width: colWidths[i] - 10, align: headerAligns[i] });
        headerX += colWidths[i];
      }

      y += 25;

      // Lignes de détail
      const earnings = lines.filter(l => l.line_type === 'earning');
      const deductions = lines.filter(l => l.line_type === 'deduction');

      // Section Rémunération Brute
      doc.rect(tableX, y, contentWidth, 18).fill('#fcfcfc');
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.textLight);
      doc.text('Rémunération Brute', tableX + 8, y + 5);
      y += 18;

      // Lignes des gains
      const workedHours = parseFloat(payslip.worked_hours) || 176;

      doc.font('Helvetica').fillColor(COLORS.text);
      for (const line of earnings) {
        this.drawPayLine(doc, tableX, y, colWidths, {
          label: line.label,
          base: line.category === 'base_salary' ? `${workedHours.toFixed(2)} h` : (line.base_amount ? this.formatAmount(line.base_amount) : 'Forfait'),
          rate: line.rate ? `${parseFloat(line.rate).toFixed(2)} %` : '',
          gain: this.formatAmount(line.amount),
          retenue: ''
        });
        y += 18;
      }

      // Total Brut
      doc.rect(tableX, y, contentWidth, 22).fill('#f2f2f2');
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.text);
      doc.text('TOTAL BRUT GLOBAL', tableX + 8, y + 6, { width: colWidths[0] + colWidths[1] + colWidths[2] - 20, align: 'right' });
      doc.fillColor(COLORS.gain);
      doc.text(this.formatAmount(payslip.gross_salary), tableX + colWidths[0] + colWidths[1] + colWidths[2], y + 6, { width: colWidths[3] - 10, align: 'right' });
      y += 22;

      // Section Cotisations
      doc.rect(tableX, y, contentWidth, 18).fill('#fcfcfc');
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.textLight);
      doc.text('Cotisations Sociales & Fiscales', tableX + 8, y + 5);
      y += 18;

      // Lignes des retenues
      doc.font('Helvetica').fillColor(COLORS.text);

      // CNSS
      const cnssBase = parseFloat(payslip.cnss_base) || parseFloat(payslip.gross_salary);
      const cnssEmployee = parseFloat(payslip.cnss_employee) || 0;
      if (cnssEmployee > 0) {
        this.drawPayLine(doc, tableX, y, colWidths, {
          label: 'CNSS (Prestations Sociales)',
          base: this.formatAmount(cnssBase),
          rate: '4.48 %',
          gain: '',
          retenue: this.formatAmount(cnssEmployee)
        });
        y += 18;
      }

      // AMO
      const amoEmployee = parseFloat(payslip.amo_employee) || 0;
      if (amoEmployee > 0) {
        this.drawPayLine(doc, tableX, y, colWidths, {
          label: 'AMO (Assurance Maladie Obligatoire)',
          base: this.formatAmount(cnssBase),
          rate: '2.26 %',
          gain: '',
          retenue: this.formatAmount(amoEmployee)
        });
        y += 18;
      }

      // IR
      const igrBase = parseFloat(payslip.igr_base) || 0;
      const igrAmount = parseFloat(payslip.igr_amount) || 0;
      this.drawPayLine(doc, tableX, y, colWidths, {
        label: 'Impôt sur le Revenu (IR)',
        base: `Net Imp: ${this.formatAmount(igrBase)}`,
        rate: igrAmount > 0 ? '' : '0.00 %',
        gain: '',
        retenue: this.formatAmount(igrAmount)
      });
      y += 18;

      // Autres retenues
      for (const line of deductions) {
        if (!['cnss', 'amo', 'igr'].includes(line.category)) {
          this.drawPayLine(doc, tableX, y, colWidths, {
            label: line.label,
            base: line.base_amount ? this.formatAmount(line.base_amount) : '',
            rate: line.rate ? `${parseFloat(line.rate).toFixed(2)} %` : '',
            gain: '',
            retenue: this.formatAmount(line.amount)
          });
          y += 18;
        }
      }

      // Total Retenues
      doc.rect(tableX, y, contentWidth, 22).fill('#f2f2f2');
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.text);
      doc.text('TOTAL DES RETENUES', tableX + 8, y + 6, { width: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] - 20, align: 'right' });
      doc.fillColor(COLORS.retenue);
      doc.text(this.formatAmount(payslip.total_deductions), tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y + 6, { width: colWidths[4] - 10, align: 'right' });
      y += 22;

      // Ligne de fin de tableau
      doc.strokeColor(COLORS.primary).lineWidth(2);
      doc.moveTo(tableX, y).lineTo(tableX + contentWidth, y).stroke();

      // =====================================================
      // FOOTER DASHBOARD
      // =====================================================
      y += 30;

      // Box Congés (gauche)
      const congesBoxWidth = 180;
      const congesBoxHeight = 95;
      doc.strokeColor(COLORS.line).lineWidth(1);
      doc.roundedRect(tableX, y, congesBoxWidth, congesBoxHeight, 4).stroke();

      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.textLight);
      doc.text('SUIVI DES CONGÉS', tableX + 10, y + 10);

      doc.strokeColor('#eeeeee').lineWidth(0.5);
      doc.moveTo(tableX + 10, y + 25).lineTo(tableX + congesBoxWidth - 10, y + 25).stroke();

      doc.fontSize(9).font('Helvetica').fillColor(COLORS.text);

      const leavePrevious = parseFloat(payslip.leave_previous_balance) || parseFloat(payslip.initial_leave_balance) || 0;
      const leaveAccrued = parseFloat(payslip.leave_accrued) || 0;
      const leaveTaken = parseFloat(payslip.leave_taken) || 0;
      const leaveCurrent = parseFloat(payslip.leave_balance) || (leavePrevious + leaveAccrued - leaveTaken);

      let congesY = y + 32;
      doc.text('Solde mois précédent:', tableX + 10, congesY);
      doc.font('Helvetica-Bold').text(`${leavePrevious.toFixed(2)} j`, tableX + 120, congesY, { width: 50, align: 'right' });

      congesY += 14;
      doc.font('Helvetica').text('Acquis ce mois:', tableX + 10, congesY);
      doc.font('Helvetica-Bold').text(`${leaveAccrued.toFixed(2)} j`, tableX + 120, congesY, { width: 50, align: 'right' });

      congesY += 14;
      doc.font('Helvetica').text('Pris ce mois:', tableX + 10, congesY);
      doc.font('Helvetica-Bold').text(`${leaveTaken.toFixed(2)} j`, tableX + 120, congesY, { width: 50, align: 'right' });

      // Ligne pointillée
      doc.strokeColor('#cccccc').lineWidth(0.5);
      doc.dash(3, 2);
      doc.moveTo(tableX + 10, congesY + 18).lineTo(tableX + congesBoxWidth - 10, congesY + 18).stroke();
      doc.undash();

      congesY += 23;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.primary);
      doc.text('SOLDE ACTUEL:', tableX + 10, congesY);
      doc.fillColor(COLORS.accent);
      doc.text(`${leaveCurrent.toFixed(2)} j`, tableX + 120, congesY, { width: 50, align: 'right' });

      // Box Net à Payer (droite)
      const netBoxWidth = 180;
      const netBoxHeight = 80;
      const netBoxX = pageWidth - marginRight - netBoxWidth;

      doc.roundedRect(netBoxX, y, netBoxWidth, netBoxHeight, 6).fill(COLORS.primary);

      doc.fontSize(11).font('Helvetica').fillColor(COLORS.white).opacity(0.9);
      doc.text('Net à Payer', netBoxX, y + 15, { width: netBoxWidth, align: 'center' });

      doc.opacity(1);
      doc.fontSize(26).font('Helvetica-Bold');
      doc.text(`${this.formatAmount(payslip.net_salary)} MAD`, netBoxX, y + 32, { width: netBoxWidth, align: 'center' });

      doc.fontSize(9).font('Helvetica').opacity(0.8);
      doc.text('Payé par virement bancaire', netBoxX, y + 60, { width: netBoxWidth, align: 'center' });
      doc.opacity(1);

      // =====================================================
      // LEGAL FOOTER
      // =====================================================
      const legalY = pageHeight - 50;

      doc.strokeColor('#eeeeee').lineWidth(0.5);
      doc.moveTo(marginLeft, legalY - 10).lineTo(pageWidth - marginRight, legalY - 10).stroke();

      doc.fontSize(8).font('Helvetica').fillColor(COLORS.textLight);
      doc.text(
        "Conformément à l'article 370 du Code du Travail. Pour faire valoir ce que de droit.",
        marginLeft, legalY,
        { width: contentWidth, align: 'center' }
      );
      doc.text(
        "Ce bulletin doit être conservé sans limitation de durée.",
        marginLeft, legalY + 12,
        { width: contentWidth, align: 'center' }
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
   * Draw a label-value pair
   */
  drawLabelValue(doc, label, value, x, y) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.textLight);
    doc.text(label, x, y, { continued: true, width: 65 });
    doc.font('Helvetica-Bold').fillColor(COLORS.text);
    doc.text(` ${value}`, { continued: false });
  }

  /**
   * Draw a pay line in the table
   */
  drawPayLine(doc, tableX, y, colWidths, data) {
    let x = tableX + 8;

    doc.fontSize(9).font('Helvetica').fillColor(COLORS.text);
    doc.text(data.label, x, y + 4, { width: colWidths[0] - 10 });
    x += colWidths[0];

    doc.text(data.base, x, y + 4, { width: colWidths[1] - 10, align: 'right' });
    x += colWidths[1];

    doc.text(data.rate, x, y + 4, { width: colWidths[2] - 10, align: 'center' });
    x += colWidths[2];

    if (data.gain) {
      doc.fillColor(COLORS.gain);
      doc.text(data.gain, x, y + 4, { width: colWidths[3] - 10, align: 'right' });
    }
    x += colWidths[3];

    if (data.retenue) {
      doc.fillColor(COLORS.retenue);
      doc.text(data.retenue, x, y + 4, { width: colWidths[4] - 10, align: 'right' });
    }

    // Ligne de séparation
    doc.strokeColor('#eeeeee').lineWidth(0.5);
    doc.moveTo(tableX, y + 17).lineTo(tableX + colWidths.reduce((a, b) => a + b, 0), y + 17).stroke();
  }

  /**
   * Generate multiple payslip PDFs
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
