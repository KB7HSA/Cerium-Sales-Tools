/**
 * Diagnostic script: Compare page dimensions in the EAMP_Summary template
 * and show what the header XML looks like to identify width issues.
 *
 * Usage: npx ts-node diagnose-width.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';

const TEMPLATE_PATH = path.join(__dirname, '..', 'public', 'templates', 'EAMP_Summary.docx');

function extractXmlPart(zip: PizZip, partPath: string): string | null {
  const file = zip.file(partPath);
  return file ? file.asText() : null;
}

function extractSectPr(documentXml: string): string | null {
  const match = documentXml.match(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/);
  return match ? match[0] : null;
}

function extractElement(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*\\/?>`, 'g');
  return xml.match(regex) || [];
}

function main() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Template not found: ${TEMPLATE_PATH}`);
    process.exit(1);
  }

  console.log('=== TEMPLATE ANALYSIS ===');
  console.log(`File: ${TEMPLATE_PATH}\n`);

  const templateBuf = fs.readFileSync(TEMPLATE_PATH);
  const zip = new PizZip(templateBuf);

  // 1. document.xml sectPr
  const documentXml = extractXmlPart(zip, 'word/document.xml');
  if (documentXml) {
    const sectPr = extractSectPr(documentXml);
    console.log('--- document.xml <w:sectPr> ---');
    console.log(sectPr || '(not found)');
    console.log();

    if (sectPr) {
      const pgSz = extractElement(sectPr, 'w:pgSz');
      const pgMar = extractElement(sectPr, 'w:pgMar');
      const cols = extractElement(sectPr, 'w:cols');
      console.log('  pgSz:', pgSz.join(' '));
      console.log('  pgMar:', pgMar.join(' '));
      console.log('  cols:', cols.join(' '));
      console.log();

      // Parse twips -> inches for readability
      const widthMatch = sectPr.match(/w:w="(\d+)"/);
      const heightMatch = sectPr.match(/w:h="(\d+)"/);
      if (widthMatch) console.log(`  Page width: ${widthMatch[1]} twips = ${(parseInt(widthMatch[1]) / 1440).toFixed(2)} inches`);
      if (heightMatch) console.log(`  Page height: ${heightMatch[1]} twips = ${(parseInt(heightMatch[1]) / 1440).toFixed(2)} inches`);
      
      // Parse margins
      const marginLeft = sectPr.match(/w:left="(\d+)"/);
      const marginRight = sectPr.match(/w:right="(\d+)"/);
      const marginTop = sectPr.match(/w:top="(\d+)"/);
      const marginBottom = sectPr.match(/w:bottom="(\d+)"/);
      const marginHeader = sectPr.match(/w:header="(\d+)"/);
      const marginFooter = sectPr.match(/w:footer="(\d+)"/);
      if (marginLeft) console.log(`  Left margin: ${marginLeft[1]} twips = ${(parseInt(marginLeft[1]) / 1440).toFixed(2)} inches`);
      if (marginRight) console.log(`  Right margin: ${marginRight[1]} twips = ${(parseInt(marginRight[1]) / 1440).toFixed(2)} inches`);
      if (marginTop) console.log(`  Top margin: ${marginTop[1]} twips = ${(parseInt(marginTop[1]) / 1440).toFixed(2)} inches`);
      if (marginBottom) console.log(`  Bottom margin: ${marginBottom[1]} twips = ${(parseInt(marginBottom[1]) / 1440).toFixed(2)} inches`);
      if (marginHeader) console.log(`  Header distance: ${marginHeader[1]} twips = ${(parseInt(marginHeader[1]) / 1440).toFixed(2)} inches`);
      if (marginFooter) console.log(`  Footer distance: ${marginFooter[1]} twips = ${(parseInt(marginFooter[1]) / 1440).toFixed(2)} inches`);
    }
  }

  // 2. Header/footer references in sectPr
  console.log('\n--- Header/Footer references in sectPr ---');
  if (documentXml) {
    const headerRefs = documentXml.match(/<w:headerReference[^>]*>/g);
    const footerRefs = documentXml.match(/<w:footerReference[^>]*>/g);
    console.log('  headerReference:', headerRefs || '(none)');
    console.log('  footerReference:', footerRefs || '(none)');
  }

  // 3. Rels
  console.log('\n--- word/_rels/document.xml.rels ---');
  const relsXml = extractXmlPart(zip, 'word/_rels/document.xml.rels');
  if (relsXml) {
    const rels = relsXml.match(/<Relationship[^>]*>/g);
    rels?.forEach(r => console.log(' ', r));
  }

  // 4. Header content
  console.log('\n--- Header files ---');
  const headerParts = zip.file(/word\/header\d+\.xml/);
  headerParts.forEach(hf => {
    const content = hf.asText();
    console.log(`\n  [${hf.name}]`);
    console.log(`  Size: ${content.length} chars`);
    // Check if it has tables and their widths
    const tableWidths = content.match(/<w:tblW[^>]*>/g);
    if (tableWidths) {
      console.log('  Table widths:', tableWidths);
    }
    // Check for drawings/images
    const drawings = content.match(/<w:drawing>/g);
    console.log(`  Drawings/images: ${drawings?.length || 0}`);
    
    // Print inner content (first 2000 chars)
    const inner = content.match(/<w:hdr[^>]*>([\s\S]*)<\/w:hdr>/);
    if (inner) {
      const snippet = inner[1].length > 2000 ? inner[1].substring(0, 2000) + '...' : inner[1];
      console.log(`\n  Inner XML:\n  ${snippet}`);
    }
  });

  // 5. Footer content
  console.log('\n--- Footer files ---');
  const footerParts = zip.file(/word\/footer\d+\.xml/);
  footerParts.forEach(ff => {
    const content = ff.asText();
    console.log(`\n  [${ff.name}]`);
    console.log(`  Size: ${content.length} chars`);
    const tableWidths = content.match(/<w:tblW[^>]*>/g);
    if (tableWidths) {
      console.log('  Table widths:', tableWidths);
    }
    const inner = content.match(/<w:ftr[^>]*>([\s\S]*)<\/w:ftr>/);
    if (inner) {
      const snippet = inner[1].length > 2000 ? inner[1].substring(0, 2000) + '...' : inner[1];
      console.log(`\n  Inner XML:\n  ${snippet}`);
    }
  });

  // Check for debug files
  const debugDir = path.join(__dirname, '..', 'public', 'converted_debug');
  if (fs.existsSync(debugDir)) {
    const debugFiles = fs.readdirSync(debugDir).filter(f => f.endsWith('.docx'));
    if (debugFiles.length > 0) {
      console.log('\n\n=== DEBUG FILE ANALYSIS ===');
      for (const file of debugFiles) {
        console.log(`\n--- ${file} ---`);
        const buf = fs.readFileSync(path.join(debugDir, file));
        const dzip = new PizZip(buf);
        const ddoc = extractXmlPart(dzip, 'word/document.xml');
        if (ddoc) {
          const sp = extractSectPr(ddoc);
          console.log('  sectPr:', sp || '(not found)');
        }
      }
    }
  }
}

main();
