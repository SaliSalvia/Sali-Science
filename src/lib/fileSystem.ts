/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { VirtualFile, FileTreeNode, ZipArchive } from './types.ts';

// Text extensions that can be read, viewed, and edited as UTF-8
export const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'py', 'c', 'h', 'cpp', 'hpp', 'cc', 'cxx',
  'java', 'rs', 'go', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json',
  'csv', 'tsv', 'xml', 'yaml', 'yml', 'sh', 'bash', 'zsh', 'bat', 'cmd',
  'tex', 'bib', 'r', 'm', 'sql', 'toml', 'ini', 'cfg', 'log', 'env'
]);

export const CODE_EXTENSIONS = new Set([
  'py', 'c', 'h', 'cpp', 'hpp', 'java', 'rs', 'go', 'js', 'ts', 'jsx', 'tsx', 'sh', 'sql'
]);

export function isTextFile(filename: string): boolean {
  const ext = getFileExtension(filename).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

export function isDocxFile(filename: string): boolean {
  return getFileExtension(filename).toLowerCase() === 'docx';
}

export function isPdfFile(filename: string): boolean {
  return getFileExtension(filename).toLowerCase() === 'pdf';
}

export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename).toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext);
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Extracts raw text and structure from a DOCX file buffer
 */
export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const documentXmlFile = zip.file('word/document.xml');
    if (!documentXmlFile) {
      return '(محتوای سند Word یافت نشد)';
    }

    const xmlText = await documentXmlFile.async('text');
    // Extract paragraphs and text nodes
    const paragraphs: string[] = [];
    // Match paragraphs <w:p>...</w:p>
    const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/g;
    let pMatch;

    while ((pMatch = pRegex.exec(xmlText)) !== null) {
      const pContent = pMatch[1];
      // Match text elements <w:t>...</w:t>
      const tRegex = /<w:t\b[^>]*>(.*?)<\/w:t>/g;
      let textChunk = '';
      let tMatch;
      while ((tMatch = tRegex.exec(pContent)) !== null) {
        textChunk += tMatch[1];
      }
      if (textChunk.trim().length > 0) {
        paragraphs.push(textChunk);
      }
    }

    if (paragraphs.length === 0) {
      // Fallback: strip all XML tags
      return xmlText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    return paragraphs.join('\n\n');
  } catch (error) {
    console.error('Error extracting DOCX:', error);
    return `(خطا در استخراج متن DOCX: ${error instanceof Error ? error.message : 'Unknown'})`;
  }
}

/**
 * Unpacks a ZIP file and converts all contents into VirtualFile models
 */
export async function unpackZipFile(
  file: File,
  archiveLabel?: string
): Promise<{ archive: ZipArchive; files: VirtualFile[] }> {
  const archiveId = `arch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const archiveName = file.name.replace(/\.zip$/i, '');
  const zip = await JSZip.loadAsync(file);

  const virtualFiles: VirtualFile[] = [];
  const entries = Object.keys(zip.files);

  for (const relativePath of entries) {
    const zipEntry = zip.files[relativePath];
    if (zipEntry.dir) continue; // Skip pure directory entries

    // Clean leading slashes
    const cleanPath = relativePath.replace(/^(\.\/|\/)/, '');
    const filename = cleanPath.split('/').pop() || cleanPath;
    const ext = getFileExtension(filename);
    const fileId = `${archiveId}_${cleanPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    if (isTextFile(filename)) {
      const content = await zipEntry.async('text');
      virtualFiles.push({
        id: fileId,
        path: cleanPath,
        name: filename,
        extension: ext,
        size: content.length,
        content: content,
        originalContent: content,
        isBinary: false,
        mimeType: getMimeType(ext),
        archiveId,
        archiveName: file.name,
        versionTag: archiveLabel || archiveName,
        lastModified: zipEntry.date ? zipEntry.date.getTime() : Date.now(),
      });
    } else if (isDocxFile(filename)) {
      const buffer = await zipEntry.async('arraybuffer');
      const extractedText = await extractDocxText(buffer);
      virtualFiles.push({
        id: fileId,
        path: cleanPath,
        name: filename,
        extension: 'docx',
        size: buffer.byteLength,
        content: extractedText,
        originalContent: extractedText,
        isBinary: false,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        archiveId,
        archiveName: file.name,
        versionTag: archiveLabel || archiveName,
        lastModified: zipEntry.date ? zipEntry.date.getTime() : Date.now(),
      });
    } else {
      // PDF or Images or binaries
      const base64 = await zipEntry.async('base64');
      const mime = getMimeType(ext);
      const dataUrl = `data:${mime};base64,${base64}`;
      virtualFiles.push({
        id: fileId,
        path: cleanPath,
        name: filename,
        extension: ext,
        size: base64.length, // approximate
        content: dataUrl,
        originalContent: dataUrl,
        isBinary: true,
        mimeType: mime,
        archiveId,
        archiveName: file.name,
        versionTag: archiveLabel || archiveName,
        lastModified: zipEntry.date ? zipEntry.date.getTime() : Date.now(),
      });
    }
  }

  const archive: ZipArchive = {
    id: archiveId,
    name: file.name,
    size: file.size,
    extractedAt: Date.now(),
    fileCount: virtualFiles.length,
    versionLabel: archiveLabel || archiveName,
  };

  return { archive, files: virtualFiles };
}

/**
 * Parses individual files uploaded directly (e.g. single .py, .pdf, .docx, .md)
 */
export async function parseSingleUploadedFile(
  file: File,
  archiveId = 'standalone_uploads'
): Promise<VirtualFile> {
  const filename = file.name;
  const ext = getFileExtension(filename);
  const fileId = `${archiveId}_${Date.now()}_${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  if (isTextFile(filename)) {
    const text = await file.text();
    return {
      id: fileId,
      path: filename,
      name: filename,
      extension: ext,
      size: file.size,
      content: text,
      originalContent: text,
      isBinary: false,
      mimeType: getMimeType(ext),
      archiveId,
      archiveName: 'فایل‌های منفرد',
      versionTag: 'جاری',
      lastModified: file.lastModified,
    };
  } else if (isDocxFile(filename)) {
    const buffer = await file.arrayBuffer();
    const extractedText = await extractDocxText(buffer);
    return {
      id: fileId,
      path: filename,
      name: filename,
      extension: 'docx',
      size: file.size,
      content: extractedText,
      originalContent: extractedText,
      isBinary: false,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      archiveId,
      archiveName: 'فایل‌های منفرد',
      versionTag: 'جاری',
      lastModified: file.lastModified,
    };
  } else {
    // Binary/PDF/Image
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binaryStr = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binaryStr += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binaryStr);
    const mime = getMimeType(ext);
    const dataUrl = `data:${mime};base64,${base64}`;

    return {
      id: fileId,
      path: filename,
      name: filename,
      extension: ext,
      size: file.size,
      content: dataUrl,
      originalContent: dataUrl,
      isBinary: true,
      mimeType: mime,
      archiveId,
      archiveName: 'فایل‌های منفرد',
      versionTag: 'جاری',
      lastModified: file.lastModified,
    };
  }
}

/**
 * Builds a hierarchical tree structure from virtual files
 */
export function buildFileTree(files: VirtualFile[]): FileTreeNode[] {
  const rootNodes: { [key: string]: FileTreeNode } = {};

  for (const file of files) {
    const parts = file.path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isLast) {
        // File node
        const fileNode: FileTreeNode = {
          id: file.id,
          name: part,
          path: file.path,
          isDirectory: false,
          size: file.size,
          extension: file.extension,
          fileId: file.id,
          isModified: file.isModified,
          archiveId: file.archiveId,
        };

        if (parentPath) {
          const parentNode = findNodeByPath(Object.values(rootNodes), parentPath);
          if (parentNode) {
            parentNode.children = parentNode.children || [];
            // replace if exists
            const existingIdx = parentNode.children.findIndex(c => c.name === part);
            if (existingIdx >= 0) {
              parentNode.children[existingIdx] = fileNode;
            } else {
              parentNode.children.push(fileNode);
            }
          }
        } else {
          rootNodes[part] = fileNode;
        }
      } else {
        // Directory node
        let dirNode: FileTreeNode | undefined;
        if (parentPath) {
          const parent = findNodeByPath(Object.values(rootNodes), parentPath);
          if (parent) {
            parent.children = parent.children || [];
            dirNode = parent.children.find(c => c.name === part && c.isDirectory);
            if (!dirNode) {
              dirNode = {
                id: `dir_${currentPath}`,
                name: part,
                path: currentPath,
                isDirectory: true,
                children: [],
                archiveId: file.archiveId,
              };
              parent.children.push(dirNode);
            }
          }
        } else {
          if (!rootNodes[part]) {
            rootNodes[part] = {
              id: `dir_${part}`,
              name: part,
              path: part,
              isDirectory: true,
              children: [],
              archiveId: file.archiveId,
            };
          }
        }
      }
    }
  }

  // Sort: directories first, then files alphabetically
  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    for (const node of nodes) {
      if (node.children) {
        sortNodes(node.children);
      }
    }
    return nodes;
  };

  return sortNodes(Object.values(rootNodes));
}

function findNodeByPath(nodes: FileTreeNode[], targetPath: string): FileTreeNode | undefined {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Creates and triggers download of a full modified ZIP archive
 */
export async function exportFilesToZip(
  files: VirtualFile[],
  zipFilename = 'axiom_refined_project.zip'
): Promise<Blob> {
  const zip = new JSZip();

  for (const file of files) {
    if (file.isBinary) {
      // Decode base64 data URL
      const base64Index = file.content.indexOf(';base64,');
      if (base64Index !== -1) {
        const rawBase64 = file.content.substring(base64Index + 8);
        zip.file(file.path, rawBase64, { base64: true });
      }
    } else {
      zip.file(file.path, file.content);
    }
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return blob;
}

/**
 * Triggers a browser download of any Blob or text content
 */
export function triggerFileDownload(content: Blob | string, filename: string, mimeType = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function getMimeType(extension: string): string {
  switch (extension.toLowerCase()) {
    case 'py': return 'text/x-python';
    case 'c':
    case 'h': return 'text/x-c';
    case 'cpp':
    case 'hpp': return 'text/x-c++src';
    case 'md': return 'text/markdown';
    case 'txt': return 'text/plain';
    case 'json': return 'application/json';
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'svg': return 'image/svg+xml';
    case 'csv': return 'text/csv';
    case 'html': return 'text/html';
    default: return 'application/octet-stream';
  }
}
