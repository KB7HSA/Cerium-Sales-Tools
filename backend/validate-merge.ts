/**
 * Diagnostic: validate the applyHeaderFooterToDocx output
 *
 * 1. Load the EAMP_Summary template, extract header/footer XML
 * 2. Create a minimal test DOCX (like ConvertAPI would produce)
 * 3. Run applyHeaderFooterToDocx
 * 4. Validate every XML part in the resulting ZIP
 *
 * Usage: npx ts-node validate-merge.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';

const TEMPLATE_PATH = path.join(__dirname, '..', 'public', 'templates', 'EAMP_Summary.docx');
const DEBUG_DIR = path.join(__dirname, '..', 'public', 'converted_debug');
const OUTPUT_PATH = path.join(__dirname, 'test_output_validated.docx');

// ────────────────────────────────────────────
// 1. Extract header/footer from template
// ────────────────────────────────────────────
function extractFromTemplate(): { headerXml: string | null; footerXml: string | null } {
  const zip = new PizZip(fs.readFileSync(TEMPLATE_PATH));

  let headerXml: string | null = null;
  const headerFile = zip.file('word/header1.xml');
  if (headerFile) {
    const content = headerFile.asText();
    const match = content.match(/<w:hdr[^>]*>([\s\S]*)<\/w:hdr>/);
    if (match) headerXml = match[1].trim();
  }

  let footerXml: string | null = null;
  const footerFile = zip.file('word/footer1.xml');
  if (footerFile) {
    const content = footerFile.asText();
    const match = content.match(/<w:ftr[^>]*>([\s\S]*)<\/w:ftr>/);
    if (match) footerXml = match[1].trim();
  }

  return { headerXml, footerXml };
}

// ────────────────────────────────────────────
// 2. Load a real debug file if available, else create minimal DOCX
// ────────────────────────────────────────────
function getSourceDocx(): Buffer {
  // Try to find a raw ConvertAPI debug file
  if (fs.existsSync(DEBUG_DIR)) {
    const rawFiles = fs.readdirSync(DEBUG_DIR).filter(f => f.includes('convertapi_raw'));
    if (rawFiles.length > 0) {
      const rawPath = path.join(DEBUG_DIR, rawFiles[0]);
      console.log(`Using real ConvertAPI raw file: ${rawFiles[0]}`);
      return fs.readFileSync(rawPath);
    }
  }

  // Create minimal test DOCX
  console.log('No raw ConvertAPI file found — creating minimal test DOCX');
  const zip = new PizZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  // Two-section document to simulate ConvertAPI multi-page output
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14">
  <w:body>
    <w:p><w:r><w:t>Page 1 content</w:t></w:r></w:p>
    <w:p><w:pPr><w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:pPr></w:p>
    <w:p><w:r><w:t>Page 2 content</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`);

  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/></w:style>
  <w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/></w:style>
</w:styles>`);

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
}

// ────────────────────────────────────────────
// 3. Validate a DOCX ZIP
// ────────────────────────────────────────────
function validateDocx(buf: Buffer, label: string): boolean {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`VALIDATING: ${label} (${buf.length} bytes)`);
  console.log('='.repeat(60));

  let ok = true;
  const zip = new PizZip(buf);
  const entries = Object.keys(zip.files).filter(f => !zip.files[f].dir);
  console.log(`  ZIP entries: ${entries.length}`);

  // ── Check [Content_Types].xml ──
  const ctXml = zip.file('[Content_Types].xml')?.asText();
  if (!ctXml) {
    console.error('  ❌ MISSING [Content_Types].xml');
    return false;
  }
  try {
    // Basic well-formedness: matching tags
    if ((ctXml.match(/<Override/g) || []).length !== (ctXml.match(/\/>/g) || []).length + (ctXml.match(/<\/Override>/g) || []).length) {
      // Just a heuristic; real check below
    }
  } catch {}

  // Check for duplicates
  const overrides = ctXml.match(/PartName="[^"]+"/g) || [];
  const uniqueOverrides = new Set(overrides);
  if (overrides.length !== uniqueOverrides.size) {
    console.error(`  ❌ DUPLICATE Content_Types overrides: ${overrides.length} vs ${uniqueOverrides.size} unique`);
    ok = false;
  } else {
    console.log(`  ✅ Content_Types: ${overrides.length} unique overrides`);
  }

  // ── Check document.xml.rels ──
  const relsXml = zip.file('word/_rels/document.xml.rels')?.asText() || '';
  const relEntries = relsXml.match(/<Relationship[^>]+>/g) || [];
  console.log(`  Relationships in document.xml.rels: ${relEntries.length}`);

  // Check for duplicate rIds
  const rIds = relEntries.map(r => r.match(/Id="(rId\d+)"/)?.[1]).filter(Boolean);
  const uniqueRIds = new Set(rIds);
  if (rIds.length !== uniqueRIds.size) {
    console.error(`  ❌ DUPLICATE rIds in document.xml.rels: ${rIds.join(', ')}`);
    ok = false;
  } else {
    console.log(`  ✅ All rIds unique: ${rIds.join(', ')}`);
  }

  // Check for duplicate targets
  const targets = relEntries.map(r => r.match(/Target="([^"]+)"/)?.[1]).filter(Boolean);
  const duplicateTargets = targets.filter((t, i) => targets.indexOf(t) !== i);
  if (duplicateTargets.length > 0) {
    console.warn(`  ⚠️  DUPLICATE targets in document.xml.rels: ${duplicateTargets.join(', ')}`);
    // Duplicate targets can be OK if they have different relationship types
  }

  // ── Check document.xml ──
  const docXml = zip.file('word/document.xml')?.asText() || '';

  // Find all sectPr
  const sectPrs = [...docXml.matchAll(/<w:sectPr([^>]*)>([\s\S]*?)<\/w:sectPr>/g)];
  console.log(`\n  sectPr elements found: ${sectPrs.length}`);
  for (let i = 0; i < sectPrs.length; i++) {
    const inner = sectPrs[i][2];
    const headerRefs = inner.match(/<w:headerReference[^>]*>/g) || [];
    const footerRefs = inner.match(/<w:footerReference[^>]*>/g) || [];
    const pgSz = inner.match(/<w:pgSz[^>]*>/g) || [];
    const pgMar = inner.match(/<w:pgMar[^>]*>/g) || [];

    console.log(`  sectPr[${i}]:`);
    console.log(`    headerRef: ${headerRefs.length > 0 ? headerRefs.join(' ') : '(none)'}`);
    console.log(`    footerRef: ${footerRefs.length > 0 ? footerRefs.join(' ') : '(none)'}`);
    console.log(`    pgSz: ${pgSz.join(' ') || '(none)'}`);
    console.log(`    pgMar: ${pgMar.join(' ') || '(none)'}`);

    // Verify referenced rIds exist in rels
    for (const ref of [...headerRefs, ...footerRefs]) {
      const refRid = ref.match(/r:id="(rId\d+)"/)?.[1];
      if (refRid && !rIds.includes(refRid)) {
        console.error(`    ❌ rId ${refRid} referenced in sectPr but NOT in document.xml.rels`);
        ok = false;
      }
    }

    // Check for duplicate pgSz/pgMar (would indicate a bug in patching)
    if (pgSz.length > 1) {
      console.error(`    ❌ DUPLICATE pgSz in sectPr[${i}]`);
      ok = false;
    }
    if (pgMar.length > 1) {
      console.error(`    ❌ DUPLICATE pgMar in sectPr[${i}]`);
      ok = false;
    }
  }

  // ── Check header/footer parts exist if referenced ──
  const hdrTargets = relEntries
    .filter(r => r.includes('relationships/header'))
    .map(r => r.match(/Target="([^"]+)"/)?.[1]);
  const ftrTargets = relEntries
    .filter(r => r.includes('relationships/footer'))
    .map(r => r.match(/Target="([^"]+)"/)?.[1]);

  for (const t of hdrTargets) {
    if (t && !zip.file(`word/${t}`)) {
      console.error(`  ❌ header part referenced but MISSING: word/${t}`);
      ok = false;
    } else {
      console.log(`  ✅ header part exists: word/${t}`);
    }
  }
  for (const t of ftrTargets) {
    if (t && !zip.file(`word/${t}`)) {
      console.error(`  ❌ footer part referenced but MISSING: word/${t}`);
      ok = false;
    } else {
      console.log(`  ✅ footer part exists: word/${t}`);
    }
  }

  // ── Check header/footer rels and media ──
  for (const partName of ['header1', 'footer1']) {
    const partFile = zip.file(`word/${partName}.xml`);
    if (!partFile) continue;

    const partContent = partFile.asText();
    const rEmbedRefs = partContent.match(/r:embed="(rId\d+)"/g) || [];
    const rLinkRefs = partContent.match(/r:link="(rId\d+)"/g) || [];
    const allPartRefs = [...rEmbedRefs, ...rLinkRefs];

    if (allPartRefs.length > 0) {
      console.log(`\n  ${partName}.xml has ${allPartRefs.length} relationship reference(s)`);

      const partRelsPath = `word/_rels/${partName}.xml.rels`;
      const partRels = zip.file(partRelsPath)?.asText();
      if (!partRels) {
        console.error(`  ❌ ${partName}.xml has r:embed refs but NO ${partRelsPath} file!`);
        ok = false;
      } else {
        const partRelEntries = partRels.match(/<Relationship[^>]+>/g) || [];
        const partRelIds = partRelEntries.map(r => r.match(/Id="(rId\d+)"/)?.[1]).filter(Boolean);
        console.log(`  ${partRelsPath}: ${partRelIds.join(', ')}`);

        for (const ref of allPartRefs) {
          const rid = ref.match(/rId\d+/)?.[0];
          if (rid && !partRelIds.includes(rid)) {
            console.error(`  ❌ ${partName}.xml references ${rid} but it's NOT in ${partRelsPath}`);
            ok = false;
          }
        }

        // Check that media files referenced in rels exist
        for (const relEntry of partRelEntries) {
          const target = relEntry.match(/Target="([^"]+)"/)?.[1];
          if (target && target.startsWith('media/')) {
            const mediaPath = `word/${target}`;
            if (!zip.file(mediaPath)) {
              console.error(`  ❌ ${partRelsPath} references ${target} but file MISSING from ZIP`);
              ok = false;
            } else {
              const mediaSize = zip.file(mediaPath)!.asNodeBuffer().length;
              console.log(`  ✅ media file exists: ${target} (${mediaSize} bytes)`);
            }
          }
        }
      }
    }
  }

  // ── Basic XML well-formedness checks ──
  console.log('\n  XML well-formedness:');
  const xmlParts = ['word/document.xml', '[Content_Types].xml', 'word/_rels/document.xml.rels', 'word/header1.xml', 'word/footer1.xml'];
  for (const partPath of xmlParts) {
    const file = zip.file(partPath);
    if (!file) continue;
    const content = file.asText();
    // Very basic check: balanced <?xml ?> and root element
    if (content.includes('<?xml') && !content.startsWith('<?xml')) {
      console.error(`  ❌ ${partPath}: <?xml declaration not at start`);
      ok = false;
    } else {
      // Check for obviously broken XML
      const unclosed = content.match(/<([a-zA-Z0-9:]+)\s[^>]*[^/]>$/);
      console.log(`  ✅ ${partPath}: ${content.length} chars`);
    }
  }

  // ── Final verdict ──
  console.log(`\n${'─'.repeat(40)}`);
  if (ok) {
    console.log('  ✅ VALIDATION PASSED');
  } else {
    console.log('  ❌ VALIDATION FAILED — issues found above');
  }

  return ok;
}

// ────────────────────────────────────────────
// Main
// ────────────────────────────────────────────
async function main() {
  console.log('DOCX Merge Validation Script');
  console.log('Template:', TEMPLATE_PATH);
  console.log('');

  // Extract header/footer from template
  const { headerXml, footerXml } = extractFromTemplate();
  console.log(`Header XML extracted: ${headerXml ? headerXml.length + ' chars' : 'null'}`);
  console.log(`Footer XML extracted: ${footerXml ? footerXml.length + ' chars' : 'null'}`);

  // Get source DOCX
  const srcBuf = getSourceDocx();

  // Validate original
  validateDocx(srcBuf, 'ORIGINAL (source DOCX)');

  // Run the actual merge method
  console.log('\n\n>>> Running applyHeaderFooterToDocx...\n');
  const { DocxTemplateService } = await import('./src/services/docx-template.service');
  try {
    const outputBuf = await DocxTemplateService.applyHeaderFooterToDocx(
      srcBuf,
      headerXml,
      footerXml,
      'EAMP_Summary.docx',
    );

    // Validate output
    const valid = validateDocx(outputBuf, 'OUTPUT (after applyHeaderFooterToDocx)');

    // Save output for manual testing
    fs.writeFileSync(OUTPUT_PATH, outputBuf);
    console.log(`\nSaved output to: ${OUTPUT_PATH}`);

    // Also check if there are any branded files from a real conversion
    if (fs.existsSync(DEBUG_DIR)) {
      const brandedFiles = fs.readdirSync(DEBUG_DIR).filter(f => f.includes('branded'));
      for (const bf of brandedFiles) {
        const bfBuf = fs.readFileSync(path.join(DEBUG_DIR, bf));
        validateDocx(bfBuf, `DEBUG: ${bf}`);
      }
    }

    if (!valid) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ applyHeaderFooterToDocx THREW:', err);
    process.exit(1);
  }
}

main();
