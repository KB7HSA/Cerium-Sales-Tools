/**
 * Script to generate Assessment Document Template
 * Run with: npx ts-node create-assessment-template.ts
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } from 'docx';
import * as fs from 'fs';
import * as path from 'path';

async function createAssessmentTemplate() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Header
        new Paragraph({
          children: [
            new TextRun({
              text: "{customerName}",
              bold: true,
              size: 48,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "{assessmentTitle}",
              bold: true,
              size: 36,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        // Practice Area & Assessment Type
        new Paragraph({
          children: [
            new TextRun({ text: "Practice Area: ", bold: true }),
            new TextRun({ text: "{practiceArea}" }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Assessment Type: ", bold: true }),
            new TextRun({ text: "{assessmentType}" }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Date: ", bold: true }),
            new TextRun({ text: "{currentDate}" }),
          ],
          spacing: { after: 400 },
        }),

        // Executive Summary Section
        new Paragraph({
          text: "Executive Summary",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "{executiveSummary}" }),
          ],
          spacing: { after: 300 },
        }),

        // Scope Section
        new Paragraph({
          text: "Scope",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "{scope}" }),
          ],
          spacing: { after: 300 },
        }),

        // Methodology Section
        new Paragraph({
          text: "Methodology",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "{methodology}" }),
          ],
          spacing: { after: 300 },
        }),

        // Recommendations Section
        new Paragraph({
          text: "Recommendations",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "{recommendations}" }),
          ],
          spacing: { after: 300 },
        }),

        // Pricing Section
        new Paragraph({
          text: "Investment Summary",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),

        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Estimated Hours", alignment: AlignmentType.LEFT })],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [new Paragraph({ text: "{estimatedHours}", alignment: AlignmentType.RIGHT })],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: "Hourly Rate", alignment: AlignmentType.LEFT })],
                }),
                new TableCell({
                  children: [new Paragraph({ text: "{hourlyRate}", alignment: AlignmentType.RIGHT })],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: "Total Investment", bold: true })],
                    alignment: AlignmentType.LEFT 
                  })],
                }),
                new TableCell({
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: "{totalPrice}", bold: true })],
                    alignment: AlignmentType.RIGHT 
                  })],
                }),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        // Footer
        new Paragraph({
          children: [
            new TextRun({ text: "\n\nPrepared by Cerium Networks", italics: true }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
        }),
      ],
    }],
  });

  // Generate the document
  const buffer = await Packer.toBuffer(doc);
  
  // Save to public/templates directory
  const outputPath = path.join(__dirname, '..', 'public', 'templates', 'Assessment-Template.docx');
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, buffer);
  console.log(`Assessment template created at: ${outputPath}`);
  
  // Also output placeholder list
  console.log('\nTemplate Placeholders:');
  console.log('- {customerName}');
  console.log('- {assessmentTitle}');
  console.log('- {practiceArea}');
  console.log('- {assessmentType}');
  console.log('- {currentDate}');
  console.log('- {executiveSummary}');
  console.log('- {scope}');
  console.log('- {methodology}');
  console.log('- {recommendations}');
  console.log('- {estimatedHours}');
  console.log('- {hourlyRate}');
  console.log('- {totalPrice}');
}

createAssessmentTemplate().catch(console.error);
