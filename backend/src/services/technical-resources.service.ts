import * as fs from 'fs';
import * as path from 'path';

/**
 * Technical Resources Service
 * 
 * Reads documents from the public/technical_references folder and extracts
 * their text content to be used as context for AI content generation.
 * Supports: .txt, .md, .pdf
 */
export class TechnicalResourcesService {

  /**
   * Get the absolute path to the technical_references directory
   */
  private static getBaseDir(): string {
    // Navigate from backend/src/services/ up to the project root, then into public/technical_references
    return path.resolve(__dirname, '..', '..', '..', 'public', 'technical_references');
  }

  /**
   * List available files in a resource folder
   */
  static async listFiles(folderPath: string): Promise<{ name: string; size: number; type: string }[]> {
    const sanitized = this.sanitizePath(folderPath);
    const fullPath = path.join(this.getBaseDir(), sanitized);

    if (!fs.existsSync(fullPath)) {
      console.warn(`[TechnicalResources] Folder not found: ${fullPath}`);
      return [];
    }

    const files: { name: string; size: number; type: string }[] = [];
    this.walkDir(fullPath, files, fullPath);
    return files;
  }

  /**
   * Recursively walk a directory and collect file info
   */
  private static walkDir(dir: string, files: { name: string; size: number; type: string }[], baseDir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.walkDir(entryPath, files, baseDir);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.txt', '.md', '.pdf', '.docx', '.json', '.csv'].includes(ext)) {
          const stats = fs.statSync(entryPath);
          files.push({
            name: path.relative(baseDir, entryPath).replace(/\\/g, '/'),
            size: stats.size,
            type: ext.replace('.', ''),
          });
        }
      }
    }
  }

  /**
   * Read and extract text from all supported files in a resource folder.
   * Returns combined text content from all files.
   */
  static async getResourceContent(folderPath: string): Promise<{ content: string; files: string[]; totalSize: number }> {
    const sanitized = this.sanitizePath(folderPath);
    const fullPath = path.join(this.getBaseDir(), sanitized);

    if (!fs.existsSync(fullPath)) {
      console.warn(`[TechnicalResources] Folder not found: ${fullPath}`);
      return { content: '', files: [], totalSize: 0 };
    }

    const fileList = await this.listFiles(folderPath);
    const sections: string[] = [];
    const fileNames: string[] = [];
    let totalSize = 0;

    for (const file of fileList) {
      const filePath = path.join(fullPath, file.name);
      try {
        let text = '';

        if (file.type === 'txt' || file.type === 'md' || file.type === 'csv') {
          text = fs.readFileSync(filePath, 'utf-8');
        } else if (file.type === 'json') {
          const raw = fs.readFileSync(filePath, 'utf-8');
          text = raw; // Include JSON as-is
        } else if (file.type === 'pdf') {
          text = await this.extractPdfText(filePath);
        }

        if (text && text.trim().length > 0) {
          // Truncate very large files to avoid exceeding token limits
          const maxCharsPerFile = 15000;
          const truncated = text.length > maxCharsPerFile
            ? text.substring(0, maxCharsPerFile) + '\n\n[... truncated for brevity ...]'
            : text;

          sections.push(`=== REFERENCE DOCUMENT: ${file.name} ===\n${truncated}`);
          fileNames.push(file.name);
          totalSize += truncated.length;
        }
      } catch (err: any) {
        console.error(`[TechnicalResources] Error reading ${filePath}: ${err.message}`);
      }
    }

    return {
      content: sections.join('\n\n'),
      files: fileNames,
      totalSize,
    };
  }

  /**
   * Extract text from a PDF file using pdf-parse
   */
  private static async extractPdfText(filePath: string): Promise<string> {
    try {
      const pdfParse = require('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (err: any) {
      console.error(`[TechnicalResources] PDF parse error for ${filePath}: ${err.message}`);
      return `[Could not extract text from PDF: ${path.basename(filePath)}]`;
    }
  }

  /**
   * List all top-level folders available in technical_references
   */
  static listAvailableFolders(): string[] {
    const baseDir = this.getBaseDir();
    if (!fs.existsSync(baseDir)) {
      return [];
    }

    const folders: string[] = [];
    this.walkFolders(baseDir, folders, baseDir);
    return folders;
  }

  /**
   * Recursively collect folder paths
   */
  private static walkFolders(dir: string, folders: string[], baseDir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const relPath = path.relative(baseDir, path.join(dir, entry.name)).replace(/\\/g, '/');
        folders.push(relPath);
        this.walkFolders(path.join(dir, entry.name), folders, baseDir);
      }
    }
  }

  /**
   * Sanitize folder path to prevent directory traversal attacks.
   * Uses path.resolve + prefix validation instead of regex replacement.
   */
  private static sanitizePath(folderPath: string): string {
    const baseDir = this.getBaseDir();
    // Resolve the requested path against the base directory
    const resolved = path.resolve(baseDir, folderPath);
    // Ensure the resolved path is still within the base directory
    if (!resolved.startsWith(baseDir)) {
      throw new Error('Access denied: path traversal detected');
    }
    // Return only the relative portion
    return path.relative(baseDir, resolved);
  }
}
