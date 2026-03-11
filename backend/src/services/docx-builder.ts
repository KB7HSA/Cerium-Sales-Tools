import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

/**
 * Minimal DOCX Builder
 * Creates a valid .docx file from an array of paragraph strings.
 * 
 * A .docx file is a ZIP archive containing XML files following the 
 * Office Open XML (OOXML) standard. This builder creates the minimum
 * required files for a valid DOCX document.
 */

// XML escape utility
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build paragraph XML elements from text
 */
function buildParagraphsXml(paragraphs: string[]): string {
  return paragraphs.map(para => {
    // Split paragraph into lines for run elements
    const lines = para.split('\n').filter(l => l.trim());
    const runs = lines.map((line, i) => {
      let runXml = `<w:r><w:t xml:space="preserve">${escapeXml(line.trim())}</w:t></w:r>`;
      // Add line break between lines within the same paragraph
      if (i < lines.length - 1) {
        runXml += `<w:r><w:br/></w:r>`;
      }
      return runXml;
    }).join('');

    return `<w:p>${runs}</w:p>`;
  }).join('');
}

/**
 * Create the main document.xml content
 */
function buildDocumentXml(paragraphs: string[]): string {
  const bodyContent = buildParagraphsXml(paragraphs);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:w10="urn:schemas-microsoft-com:office:word"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
            mc:Ignorable="w14 wp14">
  <w:body>
    ${bodyContent}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

/**
 * Create [Content_Types].xml
 */
function buildContentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
}

/**
 * Create _rels/.rels
 */
function buildRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

/**
 * Create word/_rels/document.xml.rels
 */
function buildDocumentRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
}

// ================================================================
// ZIP CREATION (Minimal ZIP file builder without external deps)
// ================================================================

interface ZipEntry {
  name: string;
  data: Buffer;
}

/**
 * Create a minimal ZIP file from entries.
 * Implements the ZIP file format specification for stored (uncompressed) entries.
 */
function createZip(entries: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const data = entry.data;

    // CRC32
    const crc = crc32(data);

    // Local file header (30 bytes + name + data)
    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0);  // signature
    localHeader.writeUInt16LE(20, 4);           // version needed
    localHeader.writeUInt16LE(0, 6);            // flags
    localHeader.writeUInt16LE(0, 8);            // compression (stored)
    localHeader.writeUInt16LE(0, 10);           // mod time
    localHeader.writeUInt16LE(0, 12);           // mod date
    localHeader.writeUInt32LE(crc, 14);         // crc32
    localHeader.writeUInt32LE(data.length, 18); // compressed size
    localHeader.writeUInt32LE(data.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26); // name length
    localHeader.writeUInt16LE(0, 28);           // extra length
    nameBuffer.copy(localHeader, 30);

    localHeaders.push(localHeader);
    localHeaders.push(data);

    // Central directory header (46 bytes + name)
    const centralHeader = Buffer.alloc(46 + nameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);  // signature
    centralHeader.writeUInt16LE(20, 4);           // version made by
    centralHeader.writeUInt16LE(20, 6);           // version needed
    centralHeader.writeUInt16LE(0, 8);            // flags
    centralHeader.writeUInt16LE(0, 10);           // compression
    centralHeader.writeUInt16LE(0, 12);           // mod time
    centralHeader.writeUInt16LE(0, 14);           // mod date
    centralHeader.writeUInt32LE(crc, 16);         // crc32
    centralHeader.writeUInt32LE(data.length, 20); // compressed size
    centralHeader.writeUInt32LE(data.length, 24); // uncompressed size
    centralHeader.writeUInt16LE(nameBuffer.length, 28); // name length
    centralHeader.writeUInt16LE(0, 30);           // extra length
    centralHeader.writeUInt16LE(0, 32);           // comment length
    centralHeader.writeUInt16LE(0, 34);           // disk start
    centralHeader.writeUInt16LE(0, 36);           // internal attrs
    centralHeader.writeUInt32LE(0, 38);           // external attrs
    centralHeader.writeUInt32LE(offset, 42);      // offset
    nameBuffer.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + data.length;
  }

  // End of central directory
  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);                 // signature
  endRecord.writeUInt16LE(0, 4);                           // disk number
  endRecord.writeUInt16LE(0, 6);                           // central dir disk
  endRecord.writeUInt16LE(entries.length, 8);              // entries on disk
  endRecord.writeUInt16LE(entries.length, 10);             // total entries
  endRecord.writeUInt32LE(centralDirSize, 12);             // central dir size
  endRecord.writeUInt32LE(centralDirOffset, 16);           // central dir offset
  endRecord.writeUInt16LE(0, 20);                          // comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, endRecord]);
}

/**
 * CRC32 implementation
 */
function crc32(data: Buffer): number {
  let crc = 0xFFFFFFFF;
  const table = getCrc32Table();
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

let crc32Table: Uint32Array | null = null;

function getCrc32Table(): Uint32Array {
  if (crc32Table) return crc32Table;
  crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crc32Table[i] = c >>> 0;
  }
  return crc32Table;
}

// ================================================================
// PUBLIC API
// ================================================================

/**
 * Create a valid DOCX file buffer from an array of paragraph strings.
 * Returns a Buffer containing the complete .docx (ZIP) file.
 */
export function createDocxFromParagraphs(paragraphs: string[]): Buffer {
  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: Buffer.from(buildContentTypesXml(), 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(buildRelsXml(), 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(buildDocumentXml(paragraphs), 'utf8') },
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(buildDocumentRelsXml(), 'utf8') }
  ];

  return createZip(entries);
}

/**
 * Create a DOCX with custom header/footer text applied.
 * The header and footer are embedded in the document section properties.
 */
export function createDocxWithHeaderFooter(
  paragraphs: string[],
  headerText?: string,
  footerText?: string
): Buffer {
  // Build document XML with header/footer references
  const bodyContent = buildParagraphsXml(paragraphs);

  const parts: ZipEntry[] = [
    { name: '[Content_Types].xml', data: Buffer.from(buildContentTypesWithHeaderFooter(!!headerText, !!footerText), 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(buildRelsXml(), 'utf8') },
  ];

  let relId = 1;
  const rels: string[] = [];

  if (headerText) {
    const headerId = `rId${relId++}`;
    parts.push({
      name: 'word/header1.xml',
      data: Buffer.from(buildHeaderXml(headerText), 'utf8')
    });
    rels.push(`<Relationship Id="${headerId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>`);
  }

  if (footerText) {
    const footerId = `rId${relId++}`;
    parts.push({
      name: 'word/footer1.xml',
      data: Buffer.from(buildFooterXml(footerText), 'utf8')
    });
    rels.push(`<Relationship Id="${footerId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>`);
  }

  // Build section properties with header/footer references
  let sectPrContent = '';
  let rIdx = 1;
  if (headerText) {
    sectPrContent += `<w:headerReference w:type="default" r:id="rId${rIdx++}"/>`;
  }
  if (footerText) {
    sectPrContent += `<w:footerReference w:type="default" r:id="rId${rIdx++}"/>`;
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            mc:Ignorable="w14 wp14">
  <w:body>
    ${bodyContent}
    <w:sectPr>
      ${sectPrContent}
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  parts.push({ name: 'word/document.xml', data: Buffer.from(documentXml, 'utf8') });

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${rels.join('\n  ')}
</Relationships>`;
  parts.push({ name: 'word/_rels/document.xml.rels', data: Buffer.from(docRelsXml, 'utf8') });

  return createZip(parts);
}

function buildContentTypesWithHeaderFooter(hasHeader: boolean, hasFooter: boolean): string {
  let overrides = `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>`;
  if (hasHeader) {
    overrides += `\n  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>`;
  }
  if (hasFooter) {
    overrides += `\n  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${overrides}
</Types>`;
}

function buildHeaderXml(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r><w:t>${escapeXml(text)}</w:t></w:r>
  </w:p>
</w:hdr>`;
}

function buildFooterXml(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:p>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r><w:t>${escapeXml(text)}</w:t></w:r>
  </w:p>
</w:ftr>`;
}
