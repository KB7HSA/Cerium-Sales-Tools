import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import sizeOf from 'image-size';

// ================================================================
// CONSTANTS
// ================================================================

// EMU (English Metric Units) per inch: 914400
// Letter page width = 8.5 in, margins = 1 in each side → usable = 6.5 in
const EMU_PER_INCH = 914400;
const MAX_IMAGE_WIDTH_INCHES = 6.5;
const MAX_IMAGE_WIDTH_EMU = MAX_IMAGE_WIDTH_INCHES * EMU_PER_INCH;

/**
 * DOCX Template Service
 * 
 * Opens an existing .docx template file, replaces template variables
 * (e.g., {EAMP_Summary}, {CustomerName}, etc.) with provided values,
 * and returns the resulting document as a Buffer.
 * 
 * Uses docxtemplater + pizzip for reliable DOCX manipulation that
 * preserves all formatting, headers, footers, styles, and images.
 */
export class DocxTemplateService {

  /**
   * Get the absolute path to a template file in /public/templates/
   */
  static getTemplatePath(templateFileName: string): string {
    // Resolve from backend dir → ../public/templates/
    return path.resolve(__dirname, '..', '..', '..', 'public', 'templates', templateFileName);
  }

  /**
   * Replace template variables in a DOCX template file.
   * 
   * @param templateFileName - Name of the template file in /public/templates/ (e.g., "EAMP_Summary.docx")
   * @param variables - Key/value map of template variables to replace (e.g., { EAMP_Summary: "extracted text..." })
   * @returns Buffer containing the resulting DOCX file
   * 
   * Template variables in the DOCX should use {VariableName} syntax.
   * For multiline content, line breaks within a variable value are preserved
   * by using the docxtemplater linebreak module approach.
   */
  static async replaceVariables(
    templateFileName: string,
    variables: Record<string, string>
  ): Promise<Buffer> {
    const templatePath = this.getTemplatePath(templateFileName);

    // Verify template file exists
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    console.log(`[DocxTemplate] Loading template: ${templatePath}`);
    const templateContent = fs.readFileSync(templatePath, 'binary');

    // Open the DOCX as a ZIP
    const zip = new PizZip(templateContent);

    // Create docxtemplater instance with options for handling linebreaks
    const doc = new Docxtemplater(zip, {
      // Use XML-safe paragraph breaks for newlines in variable values
      paragraphLoop: true,
      linebreaks: true,
      // Don't throw on missing variables — just leave them blank
      nullGetter() {
        return '';
      }
    });

    // Replace all template variables
    console.log(`[DocxTemplate] Replacing ${Object.keys(variables).length} variable(s):`, Object.keys(variables));
    doc.render(variables);

    // Generate the output DOCX as a Node.js Buffer
    const outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    console.log(`[DocxTemplate] Generated document: ${outputBuffer.length} bytes`);
    return outputBuffer;
  }

  /**
   * Replace template variables using a template buffer (instead of file path).
   * Useful when the template is stored in the database or uploaded.
   */
  static async replaceVariablesFromBuffer(
    templateBuffer: Buffer,
    variables: Record<string, string>
  ): Promise<Buffer> {
    const zip = new PizZip(templateBuffer);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter() {
        return '';
      }
    });

    doc.render(variables);

    return doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  }

  /**
   * List all template variables found in a DOCX template file.
   * Useful for displaying available variables in the admin UI.
   */
  static async listVariables(templateFileName: string): Promise<string[]> {
    const templatePath = this.getTemplatePath(templateFileName);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(templateContent);

    // Read document.xml to find variables
    const documentXml = zip.file('word/document.xml')?.asText() || '';

    // Find all {VariableName} patterns in the raw XML
    // Note: Word may split variables across XML runs, so we need to
    // look at the text content after stripping XML tags
    const textContent = documentXml.replace(/<[^>]+>/g, '');
    const variablePattern = /\{([^}]+)\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(textContent)) !== null) {
      const varName = match[1].trim();
      if (varName && !variables.includes(varName)) {
        variables.push(varName);
      }
    }

    return variables;
  }

  /**
   * Verify that a template file exists and is a valid DOCX
   */
  static async validateTemplate(templateFileName: string): Promise<{
    valid: boolean;
    error?: string;
    variables?: string[];
  }> {
    try {
      const templatePath = this.getTemplatePath(templateFileName);

      if (!fs.existsSync(templatePath)) {
        return { valid: false, error: `Template file not found: ${templateFileName}` };
      }

      const variables = await this.listVariables(templateFileName);
      return { valid: true, variables };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  // ================================================================
  // DOCX CONTENT MERGE INTO TEMPLATE
  // ================================================================

  /**
   * Helper: parse a single <Relationship ...> tag into its attributes,
   * regardless of attribute order or extra attributes like TargetMode.
   */
  private static parseRelationshipTag(tag: string): Record<string, string> | null {
    const attrs: Record<string, string> = {};
    const attrPattern = /(\w+)="([^"]*)"/g;
    let m;
    while ((m = attrPattern.exec(tag)) !== null) {
      attrs[m[1]] = m[2];
    }
    return attrs.Id && attrs.Type && attrs.Target ? attrs : null;
  }

  /**
   * Take the body content from a converted DOCX (e.g., from ConvertAPI) and
   * inject it into a template file, replacing the paragraph that contains
   * the specified placeholder variable.
   *
   * This preserves the template's headers, footers, styles, and page setup
   * while inserting the full rich content (paragraphs, tables, images) from
   * the converted document.
   *
   * @param templateFileName - Template file in /public/templates/
   * @param variableName - The variable to replace (e.g., "EAMP_Summary")
   * @param convertedDocxBuffer - Buffer of the DOCX produced by ConvertAPI
   * @returns Buffer containing the merged DOCX
   */
  static async mergeConvertedDocxIntoTemplate(
    templateFileName: string,
    variableName: string,
    convertedDocxBuffer: Buffer,
  ): Promise<Buffer> {
    const templatePath = this.getTemplatePath(templateFileName);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    console.log(`[DocxTemplate] Merging converted DOCX into template: ${templatePath}`);

    // Open both ZIPs
    const templateContent = fs.readFileSync(templatePath);
    const templateZip = new PizZip(templateContent);
    const convertedZip = new PizZip(convertedDocxBuffer);

    // ── 1. Extract body paragraphs from the converted DOCX ──
    const convertedDocXml = convertedZip.file('word/document.xml')?.asText() || '';
    // Get everything inside <w:body>...</w:body>, excluding the <w:sectPr> (section properties)
    const bodyMatch = convertedDocXml.match(/<w:body>([\s\S]*)<\/w:body>/);
    if (!bodyMatch) {
      throw new Error('Converted DOCX has no <w:body> content');
    }
    let convertedBodyContent = bodyMatch[1];
    // Strip the trailing <w:sectPr...>...</w:sectPr> from the body (template owns page setup)
    convertedBodyContent = convertedBodyContent.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, '');
    console.log(`[DocxTemplate] Extracted ${convertedBodyContent.length} chars of body content from converted DOCX`);

    // ── 2. Copy media files from converted DOCX into template ──
    const convertedFiles = convertedZip.files;
    const mediaMapping: Record<string, string> = {}; // old filename → new filename
    let mediaIndex = 1000; // start high to avoid conflicts with existing template media

    for (const [filePath, file] of Object.entries(convertedFiles)) {
      if (filePath.startsWith('word/media/') && !file.dir) {
        const ext = path.extname(filePath);
        const newFileName = `media/converted_${mediaIndex}${ext}`;
        mediaIndex++;
        templateZip.file(`word/${newFileName}`, file.asNodeBuffer());
        // Track mapping: "media/image1.png" → "media/converted_1000.png"
        const shortOld = filePath.replace('word/', '');
        mediaMapping[shortOld] = newFileName;
      }
    }
    console.log(`[DocxTemplate] Copied ${Object.keys(mediaMapping).length} media file(s) from converted DOCX`);

    // ── 3. Copy relationships from converted DOCX and remap IDs ──
    //    Uses robust attribute-order-agnostic parsing to handle extra
    //    attributes like TargetMode="External" on hyperlinks.
    const convertedRelsXml = convertedZip.file('word/_rels/document.xml.rels')?.asText() || '';
    let templateRelsXml = templateZip.file('word/_rels/document.xml.rels')?.asText() || '';

    // Find highest existing rId in template
    const rIdMatches = templateRelsXml.match(/rId(\d+)/g) || [];
    let maxRId = 0;
    for (const m of rIdMatches) {
      const num = parseInt(m.replace('rId', ''), 10);
      if (num > maxRId) maxRId = num;
    }

    // Relationship types that the BODY content can reference and we need to copy
    const bodyRelTypes = ['/image', '/hyperlink', '/chart', '/diagramData', '/oleObject'];

    // Parse relationships using attribute-agnostic approach
    const relIdMapping: Record<string, string> = {}; // old rId → new rId
    const relTagPattern = /<Relationship\s[^>]*>/g;
    let relTagMatch;
    while ((relTagMatch = relTagPattern.exec(convertedRelsXml)) !== null) {
      const attrs = this.parseRelationshipTag(relTagMatch[0]);
      if (!attrs) continue;

      const { Id: oldRId, Type: relType, Target: target, TargetMode: targetMode } = attrs;

      // Only copy relationships that the body content can reference
      if (bodyRelTypes.some(t => relType.includes(t))) {
        maxRId++;
        const newRId = `rId${maxRId}`;
        relIdMapping[oldRId] = newRId;

        // Remap target if it's a media file we copied
        const newTarget = mediaMapping[target] || target;
        const tmAttr = targetMode ? ` TargetMode="${targetMode}"` : '';
        const newRel = `<Relationship Id="${newRId}" Type="${relType}" Target="${newTarget}"${tmAttr}/>`;
        templateRelsXml = templateRelsXml.replace('</Relationships>', `${newRel}\n</Relationships>`);
      }
    }

    templateZip.file('word/_rels/document.xml.rels', templateRelsXml);
    console.log(`[DocxTemplate] Remapped ${Object.keys(relIdMapping).length} relationship(s) (images, hyperlinks, etc.)`);

    // ── 4. Update relationship IDs in the converted body content ──
    for (const [oldRId, newRId] of Object.entries(relIdMapping)) {
      // Replace r:embed="rIdX", r:link="rIdX", and r:id="rIdX" references
      const rIdPattern = new RegExp(`(r:embed|r:link|r:id)="${oldRId}"`, 'g');
      convertedBodyContent = convertedBodyContent.replace(rIdPattern, `$1="${newRId}"`);
    }

    // ── 5. Merge styles from converted DOCX into template ──
    const convertedStylesXml = convertedZip.file('word/styles.xml')?.asText() || '';
    let templateStylesXml = templateZip.file('word/styles.xml')?.asText() || '';

    if (convertedStylesXml && templateStylesXml) {
      // Extract individual <w:style> elements from converted
      const stylePattern = /<w:style\s[^>]*w:styleId="([^"]*)"[^>]*>[\s\S]*?<\/w:style>/g;
      let styleMatch;
      const existingStyleIds = new Set<string>();

      // Collect existing style IDs from template
      const templateStylePattern = /w:styleId="([^"]*)"/g;
      let tsm;
      while ((tsm = templateStylePattern.exec(templateStylesXml)) !== null) {
        existingStyleIds.add(tsm[1]);
      }

      // Add missing styles from converted → template
      let addedStyles = 0;
      while ((styleMatch = stylePattern.exec(convertedStylesXml)) !== null) {
        const styleId = styleMatch[1];
        if (!existingStyleIds.has(styleId)) {
          // Insert before </w:styles>
          templateStylesXml = templateStylesXml.replace(
            '</w:styles>',
            `${styleMatch[0]}\n</w:styles>`
          );
          existingStyleIds.add(styleId);
          addedStyles++;
        }
      }

      if (addedStyles > 0) {
        templateZip.file('word/styles.xml', templateStylesXml);
        console.log(`[DocxTemplate] Merged ${addedStyles} missing style(s) from converted DOCX`);
      }
    }

    // ── 6. Merge numbering from converted DOCX into template ──
    const convertedNumberingXml = convertedZip.file('word/numbering.xml')?.asText() || '';
    let templateNumberingXml = templateZip.file('word/numbering.xml')?.asText() || '';

    if (convertedNumberingXml) {
      // Find highest abstractNumId and numId in template
      let maxAbstractNumId = 0;
      let maxNumId = 0;
      const tAbsMatches = templateNumberingXml.match(/w:abstractNumId="(\d+)"/g) || [];
      for (const m of tAbsMatches) {
        const n = parseInt(m.match(/\d+/)![0], 10);
        if (n > maxAbstractNumId) maxAbstractNumId = n;
      }
      const tNumMatches = templateNumberingXml.match(/<w:num\s+w:numId="(\d+)"/g) || [];
      for (const m of tNumMatches) {
        const n = parseInt(m.match(/\d+/)![0], 10);
        if (n > maxNumId) maxNumId = n;
      }

      // Extract abstractNum definitions from converted
      const absNumPattern = /<w:abstractNum\s+w:abstractNumId="(\d+)"[\s\S]*?<\/w:abstractNum>/g;
      const absNumIdMap: Record<string, string> = {}; // old abstractNumId → new
      let absMatch;
      const newAbstractNums: string[] = [];
      while ((absMatch = absNumPattern.exec(convertedNumberingXml)) !== null) {
        const oldId = absMatch[1];
        maxAbstractNumId++;
        const newId = String(maxAbstractNumId);
        absNumIdMap[oldId] = newId;
        // Rewrite the abstractNumId in the definition
        let def = absMatch[0].replace(
          `w:abstractNumId="${oldId}"`,
          `w:abstractNumId="${newId}"`
        );
        newAbstractNums.push(def);
      }

      // Extract num definitions from converted (these map numId → abstractNumId)
      const numPattern = /<w:num\s+w:numId="(\d+)"[\s\S]*?<\/w:num>/g;
      const numIdMap: Record<string, string> = {}; // old numId → new
      let numMatch;
      const newNums: string[] = [];
      while ((numMatch = numPattern.exec(convertedNumberingXml)) !== null) {
        const oldNumId = numMatch[1];
        maxNumId++;
        const newNumId = String(maxNumId);
        numIdMap[oldNumId] = newNumId;
        let def = numMatch[0].replace(
          `w:numId="${oldNumId}"`,
          `w:numId="${newNumId}"`
        );
        // Also remap the abstractNumId reference inside this <w:num>
        for (const [oldAbsId, newAbsId] of Object.entries(absNumIdMap)) {
          def = def.replace(
            `w:abstractNumId w:val="${oldAbsId}"`,
            `w:abstractNumId w:val="${newAbsId}"`
          );
        }
        newNums.push(def);
      }

      // Insert into template numbering.xml
      if (templateNumberingXml && (newAbstractNums.length > 0 || newNums.length > 0)) {
        // Insert abstractNums before the first <w:num> or before </w:numbering>
        const insertAbsBefore = templateNumberingXml.includes('<w:num ')
          ? '<w:num '
          : '</w:numbering>';
        if (newAbstractNums.length > 0) {
          templateNumberingXml = templateNumberingXml.replace(
            insertAbsBefore,
            newAbstractNums.join('\n') + '\n' + insertAbsBefore
          );
        }
        // Insert nums before </w:numbering>
        if (newNums.length > 0) {
          templateNumberingXml = templateNumberingXml.replace(
            '</w:numbering>',
            newNums.join('\n') + '\n</w:numbering>'
          );
        }
        templateZip.file('word/numbering.xml', templateNumberingXml);
        console.log(`[DocxTemplate] Merged ${newAbstractNums.length} abstractNum(s) and ${newNums.length} num(s) with remapped IDs`);
      } else if (!templateNumberingXml && convertedNumberingXml) {
        // Template has no numbering — just use the converted one
        templateZip.file('word/numbering.xml', convertedNumberingXml);
        // Make sure [Content_Types].xml references it
        let ctXml = templateZip.file('[Content_Types].xml')?.asText() || '';
        if (!ctXml.includes('numbering.xml')) {
          ctXml = ctXml.replace(
            '</Types>',
            `<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>\n</Types>`
          );
          templateZip.file('[Content_Types].xml', ctXml);
        }
        console.log(`[DocxTemplate] Copied numbering.xml from converted DOCX (template had none)`);
      }

      // Remap numId references in the body content
      // Sort by old numId descending to avoid "1" → "10" then "10" → "10x" collisions
      const sortedNumIds = Object.entries(numIdMap).sort(
        (a, b) => parseInt(b[0], 10) - parseInt(a[0], 10)
      );
      for (const [oldNumId, newNumId] of sortedNumIds) {
        const numIdRefPattern = new RegExp(
          `(<w:numId\\s+w:val=")${oldNumId}(")`,
          'g'
        );
        convertedBodyContent = convertedBodyContent.replace(numIdRefPattern, `$1${newNumId}$2`);
      }
      if (Object.keys(numIdMap).length > 0) {
        console.log(`[DocxTemplate] Remapped numId references in body: ${JSON.stringify(numIdMap)}`);
      }
    }

    // ── 7. Update [Content_Types].xml to include any new media types ──
    let contentTypesXml = templateZip.file('[Content_Types].xml')?.asText() || '';
    const mediaExtensions = new Set<string>();
    for (const newFile of Object.values(mediaMapping)) {
      const ext = path.extname(newFile).replace('.', '').toLowerCase();
      mediaExtensions.add(ext);
    }
    const mimeTypes: Record<string, string> = {
      jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', bmp: 'image/bmp', tiff: 'image/tiff',
      emf: 'image/x-emf', wmf: 'image/x-wmf', svg: 'image/svg+xml',
    };
    for (const ext of mediaExtensions) {
      if (!contentTypesXml.includes(`Extension="${ext}"`)) {
        const mime = mimeTypes[ext] || `image/${ext}`;
        contentTypesXml = contentTypesXml.replace(
          '</Types>',
          `<Default Extension="${ext}" ContentType="${mime}"/>\n</Types>`
        );
      }
    }
    templateZip.file('[Content_Types].xml', contentTypesXml);

    // ── 8. Replace the placeholder paragraph in template's document.xml ──
    //    IMPORTANT: Uses function replacement ( () => ... ) to avoid
    //    special $ interpretation in String.replace() (e.g., $1, $&, $').
    let templateDocXml = templateZip.file('word/document.xml')?.asText() || '';
    const placeholder = `{${variableName}}`;
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Find the <w:p> paragraph containing the placeholder
    const paragraphPattern = new RegExp(
      `<w:p[^>]*>(?:(?!<w:p[ >]).)*?${escapedPlaceholder}.*?</w:p>`,
      's'
    );

    let replaced = false;
    if (paragraphPattern.test(templateDocXml)) {
      // Use function replacement to avoid $-sign interpretation
      templateDocXml = templateDocXml.replace(paragraphPattern, () => convertedBodyContent);
      replaced = true;
      console.log(`[DocxTemplate] Replaced {${variableName}} paragraph with converted DOCX content`);
    } else {
      // Try flexible pattern for Word-split placeholders
      const flexChars = placeholder.split('').map(c => {
        const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return escaped + '(?:<[^>]*>)*';
      }).join('');
      const flexPattern = new RegExp(
        `<w:p[^>]*>(?:(?!<w:p[ >]).)*?${flexChars}.*?</w:p>`,
        's'
      );
      if (flexPattern.test(templateDocXml)) {
        // Use function replacement to avoid $-sign interpretation
        templateDocXml = templateDocXml.replace(flexPattern, () => convertedBodyContent);
        replaced = true;
        console.log(`[DocxTemplate] Replaced split-tag {${variableName}} with converted DOCX content`);
      }
    }

    if (!replaced) {
      console.warn(`[DocxTemplate] Placeholder {${variableName}} not found — appending content before end of body`);
      templateDocXml = templateDocXml.replace('</w:body>', convertedBodyContent + '</w:body>');
    }

    templateZip.file('word/document.xml', templateDocXml);

    // ── 9. Generate final DOCX ──
    const outputBuffer = templateZip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    console.log(`[DocxTemplate] Merged document: ${outputBuffer.length} bytes`);
    return outputBuffer;
  }

  // ================================================================
  // IMAGE-BASED TEMPLATE REPLACEMENT
  // ================================================================

  /**
   * Replace a template variable with embedded page images.
   * 
   * Opens the DOCX template, finds the paragraph containing {variableName},
   * and replaces it with inline images (one per page image).
   * This preserves the template's headers, footers, and all other formatting
   * while inserting high-fidelity rendered images of the source PDF pages.
   * 
   * @param templateFileName - Template file in /public/templates/
   * @param variableName - The variable to replace (e.g., "EAMP_Summary")
   * @param imageBuffers - Array of JPEG image buffers (one per page)
   * @param additionalVars - Optional text variables to also replace
   * @returns Buffer containing the resulting DOCX
   */
  static async replaceVariableWithImages(
    templateFileName: string,
    variableName: string,
    imageBuffers: Buffer[],
    additionalVars?: Record<string, string>
  ): Promise<Buffer> {
    const templatePath = this.getTemplatePath(templateFileName);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    console.log(`[DocxTemplate] Loading template for image insertion: ${templatePath}`);
    const templateContent = fs.readFileSync(templatePath);
    const zip = new PizZip(templateContent);

    // First, handle any additional text variables via docxtemplater
    if (additionalVars && Object.keys(additionalVars).length > 0) {
      // Temporarily replace the image variable with a marker to preserve it
      const marker = `__IMG_PLACEHOLDER_${Date.now()}__`;
      const varsWithMarker = { ...additionalVars, [variableName]: marker };

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter() { return ''; }
      });
      doc.render(varsWithMarker);

      // Re-read the ZIP after docxtemplater processing
      const updatedContent = doc.getZip().generate({ type: 'nodebuffer' });
      const updatedZip = new PizZip(updatedContent);

      // Now do the image replacement on the updated ZIP
      return this.insertImagesIntoZip(updatedZip, marker, imageBuffers);
    }

    // No additional vars — directly replace the variable placeholder with images
    const placeholder = `{${variableName}}`;
    return this.insertImagesIntoZip(zip, placeholder, imageBuffers);
  }

  /**
   * Core method: find a placeholder string in document.xml and replace it
   * with inline JPEG images. Adds images to the ZIP and updates relationships.
   */
  private static insertImagesIntoZip(
    zip: PizZip,
    placeholder: string,
    imageBuffers: Buffer[]
  ): Buffer {
    console.log(`[DocxTemplate] Inserting ${imageBuffers.length} image(s) at placeholder: "${placeholder.substring(0, 50)}..."`);

    // 1. Add each image to word/media/ in the ZIP
    const imageRelIds: string[] = [];
    for (let i = 0; i < imageBuffers.length; i++) {
      const imgFileName = `media/pdfpage_${i + 1}.jpeg`;
      zip.file(`word/${imgFileName}`, imageBuffers[i]);
    }

    // 2. Read and update word/_rels/document.xml.rels to add image relationships
    let relsXml = zip.file('word/_rels/document.xml.rels')?.asText() || '';
    
    // Find the highest existing rId number
    const rIdMatches = relsXml.match(/rId(\d+)/g) || [];
    let maxRId = 0;
    for (const match of rIdMatches) {
      const num = parseInt(match.replace('rId', ''), 10);
      if (num > maxRId) maxRId = num;
    }

    for (let i = 0; i < imageBuffers.length; i++) {
      const rId = `rId${maxRId + i + 1}`;
      imageRelIds.push(rId);

      const relEntry = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/pdfpage_${i + 1}.jpeg"/>`;

      // Insert before closing </Relationships> tag
      relsXml = relsXml.replace('</Relationships>', `${relEntry}\n</Relationships>`);
    }
    zip.file('word/_rels/document.xml.rels', relsXml);

    // 3. Update [Content_Types].xml to include jpeg if not already present
    let contentTypesXml = zip.file('[Content_Types].xml')?.asText() || '';
    if (!contentTypesXml.includes('Extension="jpeg"') && !contentTypesXml.includes('Extension="jpg"')) {
      contentTypesXml = contentTypesXml.replace(
        '</Types>',
        '<Default Extension="jpeg" ContentType="image/jpeg"/>\n</Types>'
      );
      zip.file('[Content_Types].xml', contentTypesXml);
    }

    // 4. Build the image XML to insert into document.xml
    const imageXmlParts: string[] = [];
    for (let i = 0; i < imageBuffers.length; i++) {
      const dims = this.calculateImageDimensions(imageBuffers[i]);
      const drawingXml = this.buildDrawingXml(imageRelIds[i], dims.widthEmu, dims.heightEmu, i + 1);
      
      // Each image goes in its own paragraph for proper page-like layout
      imageXmlParts.push(
        `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${drawingXml}</w:r></w:p>`
      );

      // Add a page break between images (except after the last one)
      if (i < imageBuffers.length - 1) {
        imageXmlParts.push(
          `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`
        );
      }
    }
    const allImagesXml = imageXmlParts.join('');

    // 5. Find and replace the placeholder in document.xml
    let documentXml = zip.file('word/document.xml')?.asText() || '';

    // The placeholder may be in a run: <w:r>...<w:t>{EAMP_Summary}</w:t>...</w:r>
    // or it may be split across multiple runs by Word.
    // Strategy: find the <w:p> paragraph containing the placeholder text, replace the entire paragraph
    
    // First try: find the placeholder as plain text within the XML text nodes
    const escapedPlaceholder = placeholder
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Look for the paragraph containing the placeholder
    // Match <w:p...>...</w:p> that contains the placeholder text
    const paragraphPattern = new RegExp(
      `<w:p[^>]*>(?:(?!<w:p[ >]).)*?${escapedPlaceholder}.*?</w:p>`,
      's'
    );
    
    let replaced = false;
    
    if (paragraphPattern.test(documentXml)) {
      // Replace the entire paragraph containing the placeholder with image paragraphs
      documentXml = documentXml.replace(paragraphPattern, allImagesXml);
      replaced = true;
      console.log(`[DocxTemplate] Replaced placeholder paragraph with ${imageBuffers.length} image(s)`);
    } else {
      // Fallback: the placeholder might be split across XML tags by Word
      // Try stripping XML tags from text nodes to find it, then do a broader replacement
      // Search for the w:t elements that together form the placeholder
      console.log(`[DocxTemplate] Placeholder not found as plain text, trying tag-split search...`);
      
      // Remove any XML tags that Word might insert within the placeholder text
      // e.g., {EAMP_<w:rPr>...</w:rPr></w:r><w:r>Summary}
      // Build a flexible regex that allows XML tags between the placeholder characters
      const flexChars = placeholder.split('').map(c => {
        const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return escaped + '(?:<[^>]*>)*';
      }).join('');
      
      const flexPattern = new RegExp(
        `<w:p[^>]*>(?:(?!<w:p[ >]).)*?${flexChars}.*?</w:p>`,
        's'
      );

      if (flexPattern.test(documentXml)) {
        documentXml = documentXml.replace(flexPattern, allImagesXml);
        replaced = true;
        console.log(`[DocxTemplate] Replaced split-tag placeholder with ${imageBuffers.length} image(s)`);
      }
    }

    if (!replaced) {
      console.warn(`[DocxTemplate] WARNING: Placeholder "${placeholder}" not found in document.xml. Appending images at end of body.`);
      // Append before </w:body>
      documentXml = documentXml.replace('</w:body>', allImagesXml + '</w:body>');
    }

    zip.file('word/document.xml', documentXml);

    // 6. Generate the final DOCX buffer
    const outputBuffer = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    console.log(`[DocxTemplate] Generated image-based document: ${outputBuffer.length} bytes`);
    return outputBuffer;
  }

  /**
   * Calculate image dimensions in EMUs, scaling to fit page width
   */
  private static calculateImageDimensions(imageBuffer: Buffer): {
    widthEmu: number;
    heightEmu: number;
  } {
    try {
      const dimensions = sizeOf(imageBuffer);
      const width = dimensions.width || 800;
      const height = dimensions.height || 600;

      // Calculate EMUs preserving aspect ratio, capped at max page width
      let widthEmu = width * (EMU_PER_INCH / 96); // assume 96 DPI source
      let heightEmu = height * (EMU_PER_INCH / 96);

      // Scale down if wider than the usable page width
      if (widthEmu > MAX_IMAGE_WIDTH_EMU) {
        const scale = MAX_IMAGE_WIDTH_EMU / widthEmu;
        widthEmu = MAX_IMAGE_WIDTH_EMU;
        heightEmu = Math.round(heightEmu * scale);
      }

      return { widthEmu: Math.round(widthEmu), heightEmu: Math.round(heightEmu) };
    } catch (error) {
      console.warn('[DocxTemplate] Could not determine image size, using default dimensions');
      // Default to a reasonable letter-page-ish size
      return {
        widthEmu: MAX_IMAGE_WIDTH_EMU,
        heightEmu: Math.round(MAX_IMAGE_WIDTH_EMU * 1.294), // ~letter aspect ratio
      };
    }
  }

  /**
   * Build the Open XML <w:drawing> element for an inline image
   */
  private static buildDrawingXml(
    rId: string,
    widthEmu: number,
    heightEmu: number,
    pageNum: number
  ): string {
    return `<w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0"
                 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
        <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="${pageNum}" name="PDF Page ${pageNum}" descr="Page ${pageNum} from source PDF"/>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="${pageNum}" name="pdfpage_${pageNum}.jpeg"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                <a:stretch>
                  <a:fillRect/>
                </a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${widthEmu}" cy="${heightEmu}"/>
                </a:xfrm>
                <a:prstGeom prst="rect">
                  <a:avLst/>
                </a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>`;
  }

  // ================================================================
  // HEADER/FOOTER XML APPLICATION
  // ================================================================

  /**
   * Apply branded headers and footers to a DOCX buffer.
   *
   * STRATEGY: When a template file is provided, ALL header/footer parts are
   * copied directly from the template into the target DOCX.  This preserves
   * the exact XML, images, relationships, and handles all OOXML header / footer
   * types automatically:
   *
   *   - "default"  → normal/odd pages
   *   - "first"    → first page (requires <w:titlePg/> in sectPr)
   *   - "even"     → even pages (requires <w:evenAndOddHeaders/> in settings.xml)
   *
   * When no template is provided the legacy headerXml / footerXml strings are
   * used (single "default" type only).
   *
   * The method also applies the template's page size (<w:pgSz>) and margins
   * (<w:pgMar>) to every section in the target document so that header / footer
   * positioning is consistent.
   */
  static async applyHeaderFooterToDocx(
    docxBuffer: Buffer,
    headerXml: string | null,
    footerXml: string | null,
    templateFileName?: string,
  ): Promise<Buffer> {
    console.log(`[DocxTemplate] Applying custom header/footer to DOCX (${docxBuffer.length} bytes)`);

    // If a template is available, prefer the direct-copy approach
    if (templateFileName) {
      const templatePath = this.getTemplatePath(templateFileName);
      if (fs.existsSync(templatePath)) {
        return this.applyHeaderFooterFromTemplate(docxBuffer, templatePath);
      }
      console.warn(`[DocxTemplate] Template not found: ${templatePath} — falling back to XML strings`);
    }

    // ── Fallback: use the provided XML strings (single default type) ──
    return this.applyHeaderFooterFromXmlStrings(docxBuffer, headerXml, footerXml);
  }

  /**
   * Copy ALL header/footer parts from a template DOCX into the target DOCX.
   * This handles every combination of first / default / even types automatically.
   */
  private static applyHeaderFooterFromTemplate(
    docxBuffer: Buffer,
    templatePath: string,
  ): Buffer {
    const zip = new PizZip(docxBuffer);
    const templateZip = new PizZip(fs.readFileSync(templatePath));

    let relsXml = zip.file('word/_rels/document.xml.rels')?.asText() || '';
    let contentTypesXml = zip.file('[Content_Types].xml')?.asText() || '';
    let documentXml = zip.file('word/document.xml')?.asText() || '';

    // Find highest existing rId in the target
    const rIdNums = (relsXml.match(/rId(\d+)/g) || []).map(m => parseInt(m.replace('rId', ''), 10));
    let maxRId = rIdNums.length > 0 ? Math.max(...rIdNums) : 0;

    // ── Discover template header/footer parts and their types ──
    const templateRelsXml = templateZip.file('word/_rels/document.xml.rels')?.asText() || '';
    const templateRelEntries = templateRelsXml.match(/<Relationship[^>]+>/g) || [];
    const templateDocXml = templateZip.file('word/document.xml')?.asText() || '';

    // Parse template sectPr to discover which rId -> which type
    interface HfRef { partFile: string; type: string; kind: 'header' | 'footer'; templateRId: string; newRId: string }
    const hfRefs: HfRef[] = [];

    // Collect header/footer references from ALL template sectPr elements
    // (different sections may reference different header/footer parts)
    const templateSectPrs = [...templateDocXml.matchAll(/<w:sectPr[^>]*>([\s\S]*?)<\/w:sectPr>/g)];

    // Helper: parse all h/f references from a sectPr inner content string
    const parseHfRefsFromSectPr = (sectPrInner: string): void => {
      // Match headerReference and footerReference with either attribute order
      const refPattern = /<w:(header|footer)Reference\s+([^>]*)\/?>/g;
      let match;
      while ((match = refPattern.exec(sectPrInner)) !== null) {
        const kind = match[1] as 'header' | 'footer';
        const attrs = match[2];
        const type = attrs.match(/w:type="(\w+)"/)?.[1] || 'default';
        const tmplRId = attrs.match(/r:id="(rId\d+)"/)?.[1];
        if (!tmplRId) continue;

        // Skip if we already have this exact rId
        if (hfRefs.some(r => r.templateRId === tmplRId)) continue;

        // Find which file this rId points to
        const relEntry = templateRelEntries.find(r => r.includes(`Id="${tmplRId}"`));
        const target = relEntry?.match(/Target="([^"]+)"/)?.[1];
        if (target) {
          hfRefs.push({ partFile: target, type, kind, templateRId: tmplRId, newRId: '' });
        }
      }
    };

    // Scan every sectPr in the template to collect ALL unique h/f references
    for (const sp of templateSectPrs) {
      parseHfRefsFromSectPr(sp[1]);
    }

    // Determine the "primary" sectPr — the one with the most h/f references
    // This will be used as the reference set to apply to all output sections
    let primarySectPrHfRefs: HfRef[] = [];
    let primaryHasTitlePg = false;
    for (const sp of templateSectPrs) {
      const spRefs = hfRefs.filter(r => sp[1].includes(r.templateRId));
      if (spRefs.length > primarySectPrHfRefs.length) {
        primarySectPrHfRefs = spRefs;
        primaryHasTitlePg = /<w:titlePg\s*\/>/.test(sp[1]);
      }
    }

    // Also grab the last (document-level) sectPr for layout settings
    const templateDocSectPr = templateSectPrs.length > 0 ? templateSectPrs[templateSectPrs.length - 1][1] : '';

    console.log(`[DocxTemplate] Found ${hfRefs.length} header/footer ref(s) in template: ${hfRefs.map(r => `${r.kind}(${r.type})→${r.partFile}`).join(', ')}`);

    if (hfRefs.length === 0) {
      console.warn('[DocxTemplate] No header/footer references found in template sectPr; returning original');
      return docxBuffer;
    }

    // ── Remove existing header/footer parts, rels, and references from source ──
    // Remove existing header/footer part files from the source ZIP
    const existingHfFiles = Object.keys(zip.files).filter(
      f => /^word\/(header|footer)\d+\.xml$/.test(f),
    );
    for (const f of existingHfFiles) {
      zip.remove(f);
      // Remove corresponding rels
      const relsPath = `word/_rels/${f.replace('word/', '')}.rels`;
      if (zip.file(relsPath)) zip.remove(relsPath);
    }

    // Remove existing header/footer relationship entries from document.xml.rels
    relsXml = relsXml.replace(/<Relationship[^>]*(relationships\/header|relationships\/footer)[^>]*\/>\s*/g, '');

    // Remove existing header/footer content type overrides
    contentTypesXml = contentTypesXml.replace(/<Override[^>]*PartName="\/word\/(header|footer)\d+\.xml"[^>]*\/>\s*/g, '');

    // ── Copy each header/footer part from template ──
    // Track unique part files to avoid duplicating (same file may be referenced for multiple types)
    const copiedParts = new Map<string, string>(); // partFile → newRId

    for (const ref of hfRefs) {
      // Check if we already copied this part file (e.g., same header used for default + first)
      if (copiedParts.has(ref.partFile)) {
        ref.newRId = copiedParts.get(ref.partFile)!;
        continue;
      }

      // Allocate a new rId
      maxRId++;
      ref.newRId = `rId${maxRId}`;
      copiedParts.set(ref.partFile, ref.newRId);

      // Copy the part XML file
      const partContent = templateZip.file(`word/${ref.partFile}`);
      if (!partContent) {
        console.warn(`[DocxTemplate] Template part word/${ref.partFile} not found — skipping`);
        continue;
      }
      zip.file(`word/${ref.partFile}`, partContent.asNodeBuffer());
      console.log(`[DocxTemplate] Copied word/${ref.partFile} → ${ref.newRId}`);

      // Add relationship in document.xml.rels
      const relType = ref.kind === 'header'
        ? 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header'
        : 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer';
      const newRel = `<Relationship Id="${ref.newRId}" Type="${relType}" Target="${ref.partFile}"/>`;
      relsXml = relsXml.replace('</Relationships>', `${newRel}\n</Relationships>`);

      // Add Content_Types override
      const contentType = ref.kind === 'header'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml';
      if (!contentTypesXml.includes(`/word/${ref.partFile}`)) {
        contentTypesXml = contentTypesXml.replace(
          '</Types>',
          `<Override PartName="/word/${ref.partFile}" ContentType="${contentType}"/>\n</Types>`,
        );
      }

      // Copy the part's .rels and media files
      const partName = ref.partFile.replace('.xml', '');
      const partRelsPath = `word/_rels/${ref.partFile}.rels`;
      const templatePartRels = templateZip.file(partRelsPath)?.asText();
      if (templatePartRels) {
        zip.file(partRelsPath, templatePartRels);

        // Copy all media files referenced
        const targetPattern = /Target="([^"]+)"/g;
        let tm;
        while ((tm = targetPattern.exec(templatePartRels)) !== null) {
          const relTarget = tm[1];
          if (relTarget.startsWith('media/') || relTarget.startsWith('../media/')) {
            const mediaPath = relTarget.startsWith('../')
              ? `word/${relTarget.replace('../', '')}`
              : `word/${relTarget}`;
            const mediaFile = templateZip.file(mediaPath);
            if (mediaFile && !zip.file(mediaPath)) {
              zip.file(mediaPath, mediaFile.asNodeBuffer());
              console.log(`[DocxTemplate] Copied media for ${partName}: ${relTarget}`);
            }
          }
        }
      }
    }

    // Also update rIds for refs that share a part file
    for (const ref of hfRefs) {
      if (!ref.newRId && copiedParts.has(ref.partFile)) {
        ref.newRId = copiedParts.get(ref.partFile)!;
      }
    }

    // ── Read template page layout settings ──
    // Use the first sectPr that has pgMar/pgSz (usually the main body section)
    let templatePgMar: string | null = null;
    let templatePgSz: string | null = null;
    // titlePg should be true if ANY template sectPr uses a "first" type h/f
    const templateHasTitlePg = primaryHasTitlePg || hfRefs.some(r => r.type === 'first');

    // Try each template sectPr until we find page layout settings
    for (const sp of templateSectPrs) {
      if (!templatePgMar) {
        const pgMarMatch = sp[1].match(/<w:pgMar\s[^/>]*\/>/);
        if (pgMarMatch) templatePgMar = pgMarMatch[0];
      }
      if (!templatePgSz) {
        const pgSzMatch = sp[1].match(/<w:pgSz\s[^/>]*\/>/);
        if (pgSzMatch) templatePgSz = pgSzMatch[0];
      }
    }

    // Check template settings.xml for evenAndOddHeaders
    const templateSettingsXml = templateZip.file('word/settings.xml')?.asText() || '';
    const templateHasEvenOdd = /<w:evenAndOddHeaders\s*\/>/.test(templateSettingsXml);

    console.log(`[DocxTemplate] Template layout: pgSz=${templatePgSz ? 'yes' : 'no'}, pgMar=${templatePgMar ? 'yes' : 'no'}, titlePg=${templateHasTitlePg}, evenAndOddHeaders=${templateHasEvenOdd}`);

    // ── Build the header/footer reference XML to inject into each sectPr ──
    // Use the primary (most complete) set of refs for all output sections
    const buildHfRefs = (): string => {
      let refs = '';
      for (const ref of primarySectPrHfRefs) {
        if (!ref.newRId) continue;
        const tag = ref.kind === 'header' ? 'w:headerReference' : 'w:footerReference';
        refs += `<${tag} w:type="${ref.type}" r:id="${ref.newRId}"/>`;
      }
      return refs;
    };

    // ── Patch a single sectPr's inner content ──
    const patchSectPrContent = (innerContent: string, isDocumentLevel: boolean): string => {
      let content = innerContent;

      // Remove ALL existing headerReference / footerReference (any type)
      content = content.replace(/<w:headerReference\s+[^/>]*\/>/g, '');
      content = content.replace(/<w:footerReference\s+[^/>]*\/>/g, '');

      // Prepend our references
      content = buildHfRefs() + content;

      // Apply template page margins
      if (templatePgMar) {
        if (/<w:pgMar\s[^/>]*\/>/.test(content)) {
          content = content.replace(/<w:pgMar\s[^/>]*\/>/, templatePgMar);
        } else if (/<w:pgSz\s[^/>]*\/>/.test(content)) {
          content = content.replace(/(<w:pgSz\s[^/>]*\/>)/, `$1${templatePgMar}`);
        } else {
          content += templatePgMar;
        }
      }

      // Apply template page size
      if (templatePgSz) {
        if (/<w:pgSz\s[^/>]*\/>/.test(content)) {
          content = content.replace(/<w:pgSz\s[^/>]*\/>/, templatePgSz);
        } else {
          content += templatePgSz;
        }
      }

      // Add <w:titlePg/> if template uses a "first" type
      if (templateHasTitlePg) {
        if (!/<w:titlePg\s*\/>/.test(content)) {
          content += '<w:titlePg/>';
        }
      } else {
        // Remove titlePg if template doesn't use it (avoid blank first page)
        content = content.replace(/<w:titlePg\s*\/>/g, '');
      }

      return content;
    };

    // ── Update ALL <w:sectPr> elements in document.xml ──
    const sectPrRegex = /<w:sectPr([^>]*)>([\s\S]*?)<\/w:sectPr>/g;
    const allMatches = [...documentXml.matchAll(sectPrRegex)];

    if (allMatches.length > 0) {
      console.log(`[DocxTemplate] Found ${allMatches.length} sectPr element(s) — patching all`);

      // Process from last to first so replacement indices stay valid
      for (let i = allMatches.length - 1; i >= 0; i--) {
        const m = allMatches[i];
        const isDocumentLevel = (i === allMatches.length - 1);
        const attrs = m[1] || '';
        const patchedInner = patchSectPrContent(m[2], isDocumentLevel);
        const replacement = `<w:sectPr${attrs}>${patchedInner}</w:sectPr>`;

        documentXml =
          documentXml.substring(0, m.index!) +
          replacement +
          documentXml.substring(m.index! + m[0].length);
      }
    } else {
      // No sectPr — create one
      let inner = buildHfRefs();
      if (templatePgSz) inner += templatePgSz;
      if (templatePgMar) inner += templatePgMar;
      if (templateHasTitlePg) inner += '<w:titlePg/>';
      documentXml = documentXml.replace('</w:body>', `<w:sectPr>${inner}</w:sectPr></w:body>`);
    }

    // ── If template uses evenAndOddHeaders, propagate to output settings.xml ──
    if (templateHasEvenOdd) {
      let settingsXml = zip.file('word/settings.xml')?.asText() || '';
      if (settingsXml && !/<w:evenAndOddHeaders\s*\/>/.test(settingsXml)) {
        // Insert before </w:settings>
        settingsXml = settingsXml.replace(
          '</w:settings>',
          '<w:evenAndOddHeaders/></w:settings>',
        );
        zip.file('word/settings.xml', settingsXml);
        console.log('[DocxTemplate] Added <w:evenAndOddHeaders/> to settings.xml');
      }
    }

    // Write updated parts back
    zip.file('word/_rels/document.xml.rels', relsXml);
    zip.file('[Content_Types].xml', contentTypesXml);
    zip.file('word/document.xml', documentXml);

    const outputBuffer = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    console.log(`[DocxTemplate] Applied header/footer from template → ${outputBuffer.length} bytes`);
    return outputBuffer;
  }

  /**
   * Fallback: Apply header/footer from raw XML strings (single default type).
   * Used when no template file is available.
   */
  private static applyHeaderFooterFromXmlStrings(
    docxBuffer: Buffer,
    headerXml: string | null,
    footerXml: string | null,
  ): Buffer {
    const zip = new PizZip(docxBuffer);
    let relsXml = zip.file('word/_rels/document.xml.rels')?.asText() || '';
    let contentTypesXml = zip.file('[Content_Types].xml')?.asText() || '';
    let documentXml = zip.file('word/document.xml')?.asText() || '';

    const rIdNums = (relsXml.match(/rId(\d+)/g) || []).map(m => parseInt(m.replace('rId', ''), 10));
    let maxRId = rIdNums.length > 0 ? Math.max(...rIdNums) : 0;

    let headerRId: string | null = null;
    let footerRId: string | null = null;

    const xmlDecl = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const NS = 'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" mc:Ignorable="w14 w15 wp14"';

    if (headerXml && headerXml.trim()) {
      zip.file('word/header1.xml', `${xmlDecl}\n<w:hdr ${NS}>${headerXml}</w:hdr>`);
      maxRId++;
      headerRId = `rId${maxRId}`;
      relsXml = relsXml.replace('</Relationships>', `<Relationship Id="${headerRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>\n</Relationships>`);
      if (!contentTypesXml.includes('header1.xml'))
        contentTypesXml = contentTypesXml.replace('</Types>', `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>\n</Types>`);
    }

    if (footerXml && footerXml.trim()) {
      zip.file('word/footer1.xml', `${xmlDecl}\n<w:ftr ${NS}>${footerXml}</w:ftr>`);
      maxRId++;
      footerRId = `rId${maxRId}`;
      relsXml = relsXml.replace('</Relationships>', `<Relationship Id="${footerRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>\n</Relationships>`);
      if (!contentTypesXml.includes('footer1.xml'))
        contentTypesXml = contentTypesXml.replace('</Types>', `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>\n</Types>`);
    }

    if (headerRId || footerRId) {
      const sectPrRegex = /<w:sectPr([^>]*)>([\s\S]*?)<\/w:sectPr>/g;
      const allMatches = [...documentXml.matchAll(sectPrRegex)];
      for (let i = allMatches.length - 1; i >= 0; i--) {
        const m = allMatches[i];
        let inner = m[2];
        inner = inner.replace(/<w:headerReference\s+[^/>]*\/>/g, '');
        inner = inner.replace(/<w:footerReference\s+[^/>]*\/>/g, '');
        let refs = '';
        if (headerRId) refs += `<w:headerReference w:type="default" r:id="${headerRId}"/>`;
        if (footerRId) refs += `<w:footerReference w:type="default" r:id="${footerRId}"/>`;
        inner = refs + inner;
        const replacement = `<w:sectPr${m[1]}>${inner}</w:sectPr>`;
        documentXml = documentXml.substring(0, m.index!) + replacement + documentXml.substring(m.index! + m[0].length);
      }
    }

    zip.file('word/_rels/document.xml.rels', relsXml);
    zip.file('[Content_Types].xml', contentTypesXml);
    zip.file('word/document.xml', documentXml);

    const outputBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    console.log(`[DocxTemplate] Applied header/footer from XML strings → ${outputBuffer.length} bytes`);
    return outputBuffer;
  }

  /**
   * Extract header and footer XML content from an existing DOCX template file.
   * Returns ALL types (default, first, even) for display in the admin UI.
   *
   * @param templateFileName - Template file in /public/templates/
   * @returns Object with typed header/footer XML (inner content, without wrapper element)
   */
  static async extractHeaderFooterFromTemplate(
    templateFileName: string,
  ): Promise<{
    headerXml: string | null;
    footerXml: string | null;
    details: Array<{ kind: string; type: string; partFile: string; innerXml: string }>;
  }> {
    const templatePath = this.getTemplatePath(templateFileName);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const zip = new PizZip(fs.readFileSync(templatePath));
    const relsXml = zip.file('word/_rels/document.xml.rels')?.asText() || '';
    const relEntries = relsXml.match(/<Relationship[^>]+>/g) || [];
    const docXml = zip.file('word/document.xml')?.asText() || '';

    // Find ALL sectPr elements and collect h/f references from each
    const sectPrs = [...docXml.matchAll(/<w:sectPr[^>]*>([\s\S]*?)<\/w:sectPr>/g)];

    // Parse all header/footer references from ALL sectPr elements
    const seenRIds = new Set<string>();
    const allRefs: RegExpMatchArray[] = [];
    for (const sp of sectPrs) {
      const refs = [...sp[1].matchAll(/<w:(header|footer)Reference\s+[^>]*>/g)];
      for (const ref of refs) {
        const rId = ref[0].match(/r:id="(rId\d+)"/)?.[1];
        if (rId && !seenRIds.has(rId)) {
          seenRIds.add(rId);
          allRefs.push(ref);
        }
      }
    }
    const details: Array<{ kind: string; type: string; partFile: string; innerXml: string }> = [];

    let headerXml: string | null = null;
    let footerXml: string | null = null;

    for (const refMatch of allRefs) {
      const refTag = refMatch[0];
      const kind = refMatch[1]; // "header" or "footer"
      const type = refTag.match(/w:type="(\w+)"/)?.[1] || 'default';
      const rId = refTag.match(/r:id="(rId\d+)"/)?.[1];
      if (!rId) continue;

      // Find target file from rels
      const relEntry = relEntries.find(r => r.includes(`Id="${rId}"`));
      const target = relEntry?.match(/Target="([^"]+)"/)?.[1];
      if (!target) continue;

      // Read inner XML
      const partFile = zip.file(`word/${target}`);
      if (!partFile) continue;
      const partContent = partFile.asText();
      const wrapperTag = kind === 'header' ? 'w:hdr' : 'w:ftr';
      const innerMatch = partContent.match(new RegExp(`<${wrapperTag}[^>]*>([\\s\\S]*)<\\/${wrapperTag}>`));
      const innerXml = innerMatch ? innerMatch[1].trim() : '';

      details.push({ kind, type, partFile: target, innerXml });

      // For backward compat, populate the flat fields with the first found of each kind
      if (kind === 'header' && !headerXml) headerXml = innerXml;
      if (kind === 'footer' && !footerXml) footerXml = innerXml;
    }

    // Check settings for evenAndOddHeaders
    const settingsXml = zip.file('word/settings.xml')?.asText() || '';
    const hasEvenOdd = /<w:evenAndOddHeaders\s*\/>/.test(settingsXml);
    // Check ANY sectPr for titlePg
    const hasTitlePg = sectPrs.some(sp => /<w:titlePg\s*\/>/.test(sp[1]));

    console.log(`[DocxTemplate] Extracted ${details.length} header/footer part(s) from ${templateFileName}`);
    console.log(`[DocxTemplate] titlePg=${hasTitlePg}, evenAndOddHeaders=${hasEvenOdd}`);
    details.forEach(d => console.log(`  ${d.kind}(${d.type}) → ${d.partFile} (${d.innerXml.length} chars)`));

    return { headerXml, footerXml, details };
  }
}
