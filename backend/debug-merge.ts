import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';

// Inspect the raw ConvertAPI DOCX and template to understand the merge issue
const debugDir = path.resolve(__dirname, 'public', '..', 'public', 'converted_debug');

// Find the files
const rawFile = fs.readdirSync(path.resolve(__dirname, '..', 'public', 'converted_debug'))
  .find(f => f.includes('convertapi_raw'));
const mergedFile = fs.readdirSync(path.resolve(__dirname, '..', 'public', 'converted_debug'))
  .find(f => f.includes('template_merged'));
const templateFile = path.resolve(__dirname, '..', 'public', 'templates', 'EAMP_Summary.docx');

console.log('=== FILES ===');
console.log('Raw:', rawFile);
console.log('Merged:', mergedFile);
console.log('Template:', templateFile);

function inspectDocx(label: string, filePath: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`=== ${label} ===`);
  const buf = fs.readFileSync(filePath);
  const zip = new PizZip(buf);

  // List all files in the ZIP
  const files = Object.keys(zip.files).filter(f => !zip.files[f].dir);
  console.log(`\nFiles in ZIP (${files.length}):`);
  files.forEach(f => {
    const size = zip.files[f].asNodeBuffer().length;
    console.log(`  ${f} (${size} bytes)`);
  });

  // document.xml - first 2000 chars
  const docXml = zip.file('word/document.xml')?.asText() || '';
  console.log(`\ndocument.xml length: ${docXml.length} chars`);
  
  // Check for body content
  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (bodyMatch) {
    let body = bodyMatch[1];
    // Strip sectPr
    const stripped = body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, '');
    console.log(`Body content length: ${stripped.length} chars`);
    
    // Count paragraphs and tables
    const pCount = (stripped.match(/<w:p[ >]/g) || []).length;
    const tblCount = (stripped.match(/<w:tbl[ >]/g) || []).length;
    console.log(`Paragraphs: ${pCount}, Tables: ${tblCount}`);

    // Check for image references
    const imageRefs = stripped.match(/r:embed="([^"]+)"/g) || [];
    console.log(`Image references: ${imageRefs.length}`, imageRefs);
    
    // Check for {EAMP_Summary} or split version
    if (stripped.includes('{EAMP_Summary}')) {
      console.log('Contains {EAMP_Summary} as plain text');
    } else if (stripped.includes('EAMP_Summary')) {
      console.log('Contains EAMP_Summary (possibly split across tags)');
      // Find the context
      const idx = stripped.indexOf('EAMP_Summary');
      console.log('Context:', stripped.substring(Math.max(0, idx - 200), idx + 200));
    }
  }

  // Relationships
  const relsXml = zip.file('word/_rels/document.xml.rels')?.asText() || '';
  console.log(`\nRelationships XML (${relsXml.length} chars):`);
  // Parse each relationship
  const relPattern = /<Relationship[^>]+>/g;
  let m;
  while ((m = relPattern.exec(relsXml)) !== null) {
    console.log(`  ${m[0]}`);
  }

  // Content Types
  const ctXml = zip.file('[Content_Types].xml')?.asText() || '';
  console.log(`\n[Content_Types].xml (${ctXml.length} chars):`);
  const defaultTypes = ctXml.match(/<Default[^>]+>/g) || [];
  defaultTypes.forEach(d => console.log(`  ${d}`));

  // Styles - check if numbering/styles exist
  const hasStyles = !!zip.file('word/styles.xml');
  const hasNumbering = !!zip.file('word/numbering.xml');
  const hasFonts = !!zip.file('word/fontTable.xml');
  const hasTheme = !!zip.file('word/theme/theme1.xml');
  console.log(`\nhas styles.xml: ${hasStyles}`);
  console.log(`has numbering.xml: ${hasNumbering}`);
  console.log(`has fontTable.xml: ${hasFonts}`);
  console.log(`has theme1.xml: ${hasTheme}`);

  // Check for style references in document body
  if (bodyMatch) {
    const body = bodyMatch[1];
    const styleRefs = new Set<string>();
    const stylePattern = /w:val="([^"]+)"/g;
    let sm;
    // Get pStyle and rStyle references
    const pStyleRefs = body.match(/<w:pStyle w:val="([^"]+)"/g) || [];
    const rStyleRefs = body.match(/<w:rStyle w:val="([^"]+)"/g) || [];
    console.log(`\nParagraph style refs: ${pStyleRefs.length}`);
    pStyleRefs.forEach(s => console.log(`  ${s}`));
    console.log(`Run style refs: ${rStyleRefs.length}`);
    rStyleRefs.forEach(s => console.log(`  ${s}`));

    // Numbering references
    const numRefs = body.match(/<w:numId w:val="([^"]+)"/g) || [];
    console.log(`Numbering refs: ${numRefs.length}`);
    numRefs.forEach(s => console.log(`  ${s}`));
  }
}

// Inspect each file
inspectDocx('TEMPLATE (EAMP_Summary.docx)', templateFile);

const rawPath = path.resolve(__dirname, '..', 'public', 'converted_debug', rawFile!);
inspectDocx('RAW ConvertAPI DOCX', rawPath);

if (mergedFile) {
  const mergedPath = path.resolve(__dirname, '..', 'public', 'converted_debug', mergedFile);
  inspectDocx('TEMPLATE-MERGED DOCX', mergedPath);
}
