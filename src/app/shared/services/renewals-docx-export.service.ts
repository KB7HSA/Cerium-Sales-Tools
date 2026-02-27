import { Injectable } from '@angular/core';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  TableOfContents, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, PageBreak, Header, Footer,
  StyleLevel, LevelFormat, convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';

export interface DocxExportData {
  customerName: string;
  generatedDate: string;
  aiContent: string; // raw markdown
  hwSummary: { items: number; quantity: number; opportunity: number; architectures: string[] };
  swSummary: { items: number; quantity: number; opportunity: number; listPrice: number; architectures: string[] };
  hwByArchitecture: { architecture: string; itemCount: number; quantity: number; opportunity: number }[];
  swByArchitecture: { architecture: string; itemCount: number; quantity: number; opportunity: number }[];
  hwEolTimeline: { period: string; count: number; opportunity: number }[];
  swEndingSoon: { period: string; count: number; opportunity: number }[];
  aiModel?: string;
  aiTokens?: number;
}

/**
 * Service to export Cisco Renewals AI Analysis as a styled DOCX document
 * with Cerium Networks branding, Table of Contents, and professional formatting.
 */
@Injectable({ providedIn: 'root' })
export class RenewalsDocxExportService {

  // Cerium brand colors
  private readonly BRAND_PRIMARY = '1B4F72';   // Dark blue
  private readonly BRAND_ACCENT  = '2E86C1';   // Accent blue
  private readonly BRAND_LIGHT   = 'D6EAF8';   // Light blue background
  private readonly GRAY_DARK     = '2C3E50';
  private readonly GRAY_MED      = '7F8C8D';
  private readonly WHITE         = 'FFFFFF';

  async exportToDocx(data: DocxExportData): Promise<void> {
    const children: (Paragraph | Table | TableOfContents)[] = [];

    // --- Cover Page ---
    children.push(...this.buildCoverPage(data));

    // --- Table of Contents ---
    children.push(
      new Paragraph({ spacing: { before: 400, after: 200 }, children: [] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: 'Table of Contents', color: this.BRAND_PRIMARY })],
      }),
      new TableOfContents('Table of Contents', {
        hyperlink: true,
        headingStyleRange: '1-3',
        stylesWithLevels: [
          new StyleLevel('Heading1', 1),
          new StyleLevel('Heading2', 2),
          new StyleLevel('Heading3', 3),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),
    );

    // --- Executive Data Summary (tables) ---
    children.push(...this.buildDataSummarySection(data));

    // --- AI Analysis Content (parsed from markdown) ---
    children.push(...this.parseMarkdownToDocx(data.aiContent));

    // --- Footer disclaimer ---
    children.push(
      new Paragraph({ spacing: { before: 600 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '— End of Document —',
            color: this.GRAY_MED,
            italics: true,
            size: 18,
          }),
        ],
      }),
    );

    const doc = new Document({
      creator: 'Cerium Networks',
      title: `Cisco Renewal Analysis — ${data.customerName}`,
      description: `AI-generated renewal analysis for ${data.customerName}`,
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 22, color: this.GRAY_DARK },
            paragraph: { spacing: { after: 120, line: 276 } },
          },
          heading1: {
            run: { font: 'Calibri', size: 32, bold: true, color: this.BRAND_PRIMARY },
            paragraph: { spacing: { before: 360, after: 200 } },
          },
          heading2: {
            run: { font: 'Calibri', size: 26, bold: true, color: this.BRAND_ACCENT },
            paragraph: { spacing: { before: 280, after: 160 } },
          },
          heading3: {
            run: { font: 'Calibri', size: 24, bold: true, color: this.GRAY_DARK },
            paragraph: { spacing: { before: 200, after: 120 } },
          },
        },
      },
      numbering: {
        config: [{
          reference: 'bullet-list',
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } } },
            { level: 1, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(1.0), hanging: convertInchesToTwip(0.25) } } } },
            { level: 2, format: LevelFormat.BULLET, text: '\u25AA', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(1.5), hanging: convertInchesToTwip(0.25) } } } },
          ],
        }],
      },
      features: { updateFields: true },
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Cerium Networks', bold: true, color: this.BRAND_PRIMARY, size: 18, font: 'Calibri' }),
                  new TextRun({ text: '  |  Cisco Renewal Analysis', color: this.GRAY_MED, size: 18, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'CONFIDENTIAL — ', bold: true, color: this.BRAND_PRIMARY, size: 16 }),
                  new TextRun({ text: `Prepared for ${data.customerName}`, color: this.GRAY_MED, size: 16 }),
                ],
              }),
            ],
          }),
        },
        children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const filename = `Cisco_Renewal_Analysis_${data.customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${data.generatedDate}.docx`;
    saveAs(blob, filename);
  }

  // ---------------------------------------------------------------------------
  // Cover Page
  // ---------------------------------------------------------------------------
  private buildCoverPage(data: DocxExportData): Paragraph[] {
    const totalOpportunity = data.hwSummary.opportunity + data.swSummary.opportunity;
    return [
      new Paragraph({ spacing: { before: 2000 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'CERIUM NETWORKS', font: 'Calibri', size: 44, bold: true, color: this.BRAND_PRIMARY })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Technology Solutions & Managed Services', font: 'Calibri', size: 22, color: this.GRAY_MED, italics: true })],
      }),
      new Paragraph({ spacing: { before: 600 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Cisco Renewal Analysis', font: 'Calibri', size: 52, bold: true, color: this.GRAY_DARK })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: data.customerName, font: 'Calibri', size: 36, bold: true, color: this.BRAND_ACCENT })],
      }),
      // Divider
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: this.BRAND_ACCENT } },
        children: [],
      }),
      // Summary metrics
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Total Opportunity: ', font: 'Calibri', size: 28, color: this.GRAY_DARK }),
          new TextRun({ text: this.formatCurrency(totalOpportunity), font: 'Calibri', size: 28, bold: true, color: this.BRAND_PRIMARY }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `Hardware: ${this.formatCurrency(data.hwSummary.opportunity)}  |  Software: ${this.formatCurrency(data.swSummary.opportunity)}`, font: 'Calibri', size: 22, color: this.GRAY_MED }),
        ],
      }),
      new Paragraph({ spacing: { before: 800 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `Prepared: ${data.generatedDate}`, font: 'Calibri', size: 20, color: this.GRAY_MED }),
        ],
      }),
      data.aiModel ? new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `AI Model: ${data.aiModel}`, font: 'Calibri', size: 18, color: this.GRAY_MED, italics: true }),
        ],
      }) : new Paragraph({ children: [] }),
      new Paragraph({ children: [new PageBreak()] }),
    ];
  }

  // ---------------------------------------------------------------------------
  // Data Summary Tables
  // ---------------------------------------------------------------------------
  private buildDataSummarySection(data: DocxExportData): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];

    elements.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Renewal Portfolio Overview', color: this.BRAND_PRIMARY })],
    }));

    // Hardware by Architecture table
    if (data.hwByArchitecture.length > 0) {
      elements.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Hardware by Architecture', color: this.BRAND_ACCENT })],
      }));
      elements.push(this.buildTable(
        ['Architecture', 'Items', 'Quantity', 'Opportunity'],
        data.hwByArchitecture.map(r => [r.architecture, r.itemCount.toString(), r.quantity.toString(), this.formatCurrency(r.opportunity)]),
      ));
    }

    // Software by Architecture table
    if (data.swByArchitecture.length > 0) {
      elements.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Software by Architecture', color: this.BRAND_ACCENT })],
      }));
      elements.push(this.buildTable(
        ['Architecture', 'Items', 'Quantity', 'Opportunity'],
        data.swByArchitecture.map(r => [r.architecture, r.itemCount.toString(), r.quantity.toString(), this.formatCurrency(r.opportunity)]),
      ));
    }

    // Hardware EOL Timeline
    if (data.hwEolTimeline.length > 0) {
      elements.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Hardware LDOS Timeline', color: this.BRAND_ACCENT })],
      }));
      elements.push(this.buildTable(
        ['Period', 'Items', 'Opportunity'],
        data.hwEolTimeline.map(r => [r.period, r.count.toString(), this.formatCurrency(r.opportunity)]),
      ));
    }

    // Software End Date Timeline
    if (data.swEndingSoon.length > 0) {
      elements.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Software End Date Timeline', color: this.BRAND_ACCENT })],
      }));
      elements.push(this.buildTable(
        ['Period', 'Items', 'Opportunity'],
        data.swEndingSoon.map(r => [r.period, r.count.toString(), this.formatCurrency(r.opportunity)]),
      ));
    }

    elements.push(new Paragraph({ children: [new PageBreak()] }));
    return elements;
  }

  // ---------------------------------------------------------------------------
  // Table Builder
  // ---------------------------------------------------------------------------
  private buildTable(headers: string[], rows: string[][]): Table {
    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map(h => new TableCell({
        shading: { type: ShadingType.SOLID, color: this.BRAND_PRIMARY },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: h, bold: true, color: this.WHITE, size: 20, font: 'Calibri' })],
        })],
        verticalAlign: 'center' as any,
      })),
    });

    const dataRows = rows.map((row, idx) =>
      new TableRow({
        children: row.map((cell, colIdx) => new TableCell({
          shading: idx % 2 === 0
            ? { type: ShadingType.SOLID, color: this.BRAND_LIGHT }
            : undefined,
          children: [new Paragraph({
            alignment: colIdx >= (row.length - 1) ? AlignmentType.RIGHT : (colIdx > 0 ? AlignmentType.CENTER : AlignmentType.LEFT),
            children: [new TextRun({ text: cell, size: 20, font: 'Calibri', color: this.GRAY_DARK })],
          })],
        })),
      })
    );

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    });
  }

  // ---------------------------------------------------------------------------
  // Markdown → DOCX Parser
  // ---------------------------------------------------------------------------
  private parseMarkdownToDocx(markdown: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const lines = markdown.split('\n');
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        if (inList) inList = false;
        continue;
      }

      // Headings
      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].replace(/[#*_`]/g, '').trim();
        const heading = level === 1 ? HeadingLevel.HEADING_1
                      : level === 2 ? HeadingLevel.HEADING_2
                      : HeadingLevel.HEADING_3;
        paragraphs.push(new Paragraph({
          heading,
          children: this.parseInlineFormatting(text, {
            color: level <= 2 ? this.BRAND_PRIMARY : this.GRAY_DARK,
            bold: true,
          }),
        }));
        continue;
      }

      // Bullet / list items (-, *, or numbered 1.)
      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/);
      const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
      if (bulletMatch || numberedMatch) {
        const text = bulletMatch ? bulletMatch[1] : numberedMatch![1];
        const indentLevel = this.detectIndentLevel(line);
        paragraphs.push(new Paragraph({
          numbering: { reference: 'bullet-list', level: Math.min(indentLevel, 2) },
          children: this.parseInlineFormatting(text),
        }));
        inList = true;
        continue;
      }

      // Horizontal rule
      if (/^[-*_]{3,}$/.test(trimmed)) {
        paragraphs.push(new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: this.BRAND_ACCENT } },
          spacing: { before: 120, after: 120 },
          children: [],
        }));
        continue;
      }

      // Regular paragraph
      paragraphs.push(new Paragraph({
        children: this.parseInlineFormatting(trimmed),
        spacing: { after: 120, line: 276 },
      }));
    }

    return paragraphs;
  }

  /**
   * Parse inline markdown: **bold**, *italic*, `code`, [text](url)
   */
  private parseInlineFormatting(text: string, defaults?: { color?: string; bold?: boolean }): TextRun[] {
    const runs: TextRun[] = [];
    // Regex to match bold, italic, code, or links
    const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Plain text before this match
      if (match.index > lastIndex) {
        runs.push(new TextRun({
          text: text.slice(lastIndex, match.index),
          color: defaults?.color || this.GRAY_DARK,
          bold: defaults?.bold,
          size: defaults?.bold ? undefined : 22,
          font: 'Calibri',
        }));
      }

      if (match[2]) {
        // **bold**
        runs.push(new TextRun({
          text: match[2],
          bold: true,
          color: defaults?.color || this.GRAY_DARK,
          font: 'Calibri',
          size: 22,
        }));
      } else if (match[4]) {
        // *italic*
        runs.push(new TextRun({
          text: match[4],
          italics: true,
          color: defaults?.color || this.GRAY_MED,
          font: 'Calibri',
          size: 22,
        }));
      } else if (match[6]) {
        // `code`
        runs.push(new TextRun({
          text: match[6],
          font: 'Consolas',
          color: this.BRAND_ACCENT,
          size: 20,
          shading: { type: ShadingType.SOLID, color: 'F0F0F0' },
        }));
      } else if (match[8]) {
        // [text](url) — just output the link text
        runs.push(new TextRun({
          text: match[8],
          color: this.BRAND_ACCENT,
          underline: {},
          font: 'Calibri',
          size: 22,
        }));
      }

      lastIndex = match.index + match[0].length;
    }

    // Remaining plain text
    if (lastIndex < text.length) {
      runs.push(new TextRun({
        text: text.slice(lastIndex),
        color: defaults?.color || this.GRAY_DARK,
        bold: defaults?.bold,
        size: defaults?.bold ? undefined : 22,
        font: 'Calibri',
      }));
    }

    // Fallback if no runs produced
    if (runs.length === 0) {
      runs.push(new TextRun({
        text,
        color: defaults?.color || this.GRAY_DARK,
        bold: defaults?.bold,
        font: 'Calibri',
        size: 22,
      }));
    }

    return runs;
  }

  private detectIndentLevel(line: string): number {
    const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
    if (leadingSpaces >= 8) return 2;
    if (leadingSpaces >= 4) return 1;
    return 0;
  }

  private formatCurrency(value: number): string {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
}
