/**
 * Analyze the EAMP_Summary template to understand all header/footer types.
 */
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';

const TEMPLATE_PATH = path.join(__dirname, '..', 'public', 'templates', 'EAMP_Summary.docx');
const zip = new PizZip(fs.readFileSync(TEMPLATE_PATH));

// List all header/footer parts
console.log('=== ZIP header/footer parts ===');
const allFiles = Object.keys(zip.files).filter(f => !zip.files[f].dir);
const hfParts = allFiles.filter(f => /word\/(header|footer)\d+\.xml$/.test(f));
console.log(hfParts);

// List all header/footer rels
const hfRels = allFiles.filter(f => /word\/_rels\/(header|footer)\d+\.xml\.rels$/.test(f));
console.log('Rels:', hfRels);

// Read document.xml.rels
console.log('\n=== document.xml.rels ===');
const rels = zip.file('word/_rels/document.xml.rels')!.asText();
const relEntries = rels.match(/<Relationship[^>]+>/g) || [];
const headerFooterRels = relEntries.filter(r => /header|footer/i.test(r));
headerFooterRels.forEach(r => console.log(' ', r));

// Read ALL sectPr in document.xml
console.log('\n=== sectPr header/footer references ===');
const docXml = zip.file('word/document.xml')!.asText();
const sectPrs = [...docXml.matchAll(/<w:sectPr([^>]*)>([\s\S]*?)<\/w:sectPr>/g)];
for (let i = 0; i < sectPrs.length; i++) {
  const inner = sectPrs[i][2];
  const hdrRefs = inner.match(/<w:headerReference[^>]*>/g) || [];
  const ftrRefs = inner.match(/<w:footerReference[^>]*>/g) || [];
  const titlePg = /<w:titlePg/.test(inner);
  console.log(`  sectPr[${i}]${i === sectPrs.length - 1 ? ' (document-level)' : ' (section break)'}:`);
  console.log(`    titlePg: ${titlePg}`);
  hdrRefs.forEach(r => console.log(`    ${r}`));
  ftrRefs.forEach(r => console.log(`    ${r}`));
  if (hdrRefs.length === 0 && ftrRefs.length === 0) console.log('    (no header/footer refs)');
}

// Check settings.xml for evenAndOddHeaders
const settingsXml = zip.file('word/settings.xml')?.asText() || '';
const hasEvenOdd = /evenAndOddHeaders/.test(settingsXml);
console.log(`\n=== settings.xml ===`);
console.log(`  evenAndOddHeaders: ${hasEvenOdd}`);

// Show each header/footer part's inner content length + type context
console.log('\n=== Part details ===');
for (const partPath of hfParts) {
  const content = zip.file(partPath)!.asText();
  const partName = path.basename(partPath, '.xml');
  // Find which rId references this
  const targetName = path.basename(partPath);
  const matchingRel = relEntries.find(r => r.includes(`Target="${targetName}"`));
  const rId = matchingRel?.match(/Id="(rId\d+)"/)?.[1] || '?';
  
  // Find what type it's used as in sectPr
  const types: string[] = [];
  for (const sp of sectPrs) {
    const inner = sp[2];
    const refs = inner.match(new RegExp(`<w:(header|footer)Reference[^>]*r:id="${rId}"[^>]*>`, 'g')) || [];
    for (const ref of refs) {
      const t = ref.match(/w:type="(\w+)"/)?.[1];
      if (t) types.push(t);
    }
  }
  
  console.log(`\n  ${partPath}:`);
  console.log(`    rId: ${rId}`);
  console.log(`    used as type(s): ${types.length > 0 ? types.join(', ') : '(not directly referenced in sectPr)'}`);
  console.log(`    size: ${content.length} chars`);
  
  // Check for images
  const embedRefs = content.match(/r:embed="rId\d+"/g) || [];
  console.log(`    image refs: ${embedRefs.length}`);
  
  // Check rels
  const partRelsPath = `word/_rels/${targetName}.rels`;
  const partRels = zip.file(partRelsPath)?.asText();
  if (partRels) {
    const partRelEntries = partRels.match(/<Relationship[^>]+>/g) || [];
    partRelEntries.forEach(r => console.log(`    rel: ${r}`));
  }
}
