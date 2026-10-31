import path from 'node:path';

export const QUESTION_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const QUESTION_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const DANGEROUS_EXTENSIONS = new Set([
  'php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phar', 'inc',
  'html', 'htm', 'xhtml', 'shtml', 'svg', 'xml',
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
  'jsp', 'jspx', 'asp', 'aspx', 'cer', 'asa', 'asax',
  'cgi', 'pl', 'py', 'pyw', 'rb', 'sh', 'bash', 'zsh',
  'exe', 'dll', 'com', 'bat', 'cmd', 'vbs', 'ps1', 'msi', 'jar',
  'htaccess', 'htpasswd', 'ini', 'env', 'config'
]);

export function detectQuestionImageMime(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export function questionImageExtension(mimeType) {
  return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[mimeType] || null;
}

export function validateQuestionImage({ originalName, buffer }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error('Berkas gambar kosong atau tidak valid.'), { status: 400 });
  }

  if (buffer.length > QUESTION_IMAGE_MAX_BYTES) {
    throw Object.assign(new Error('Ukuran gambar maksimal 3 MB.'), { status: 413 });
  }

  // 1. Filename & Extension Sanitization and Validation
  if (typeof originalName !== 'string' || !originalName.trim()) {
    throw Object.assign(new Error('Nama berkas gambar tidak valid.'), { status: 400 });
  }

  const cleanName = path.basename(originalName.trim());
  if (cleanName.includes('\0') || cleanName.includes('/') || cleanName.includes('\\')) {
    throw Object.assign(new Error('Nama berkas tidak aman.'), { status: 400 });
  }

  const nameParts = cleanName.toLowerCase().split('.').filter(Boolean);
  if (nameParts.length < 2) {
    throw Object.assign(new Error('Berkas harus memiliki ekstensi gambar (.jpg, .jpeg, .png, atau .webp).'), { status: 400 });
  }

  // Defend against double-extension bypasses (e.g. image.php.jpg or malware.exe.png)
  for (let i = 1; i < nameParts.length; i++) {
    if (DANGEROUS_EXTENSIONS.has(nameParts[i])) {
      throw Object.assign(new Error('Ekstensi berkas terlarang terdeteksi.'), { status: 400 });
    }
  }

  const rawExt = nameParts[nameParts.length - 1];
  const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);
  if (!ALLOWED_EXTS.has(rawExt)) {
    throw Object.assign(new Error(`Ekstensi berkas .${rawExt} tidak diizinkan. Gunakan .jpg, .jpeg, .png, atau .webp.`), { status: 400 });
  }

  // 2. Anti-Sabotage & Binary Header Check
  // DOS / Windows PE executable ('MZ')
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    throw Object.assign(new Error('Berkas ditolak: format executable terdeteksi.'), { status: 400 });
  }
  // Linux ELF executable ('\x7fELF')
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    throw Object.assign(new Error('Berkas ditolak: format executable binary terdeteksi.'), { status: 400 });
  }
  // Script shebang ('#!')
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    throw Object.assign(new Error('Berkas ditolak: script shell terdeteksi.'), { status: 400 });
  }

  // 3. Anti-Polyglot & Script Injection Check
  const latin1Content = buffer.toString('latin1').toLowerCase();
  const dangerousSignatures = [
    '<?php', '<script', '<!doctype', '<html', '<?xml',
    'base64_decode(', 'shell_exec(', 'passthru(', 'system(',
    '__halt_compiler(', 'javascript:', 'vbscript:'
  ];
  for (const sig of dangerousSignatures) {
    if (latin1Content.includes(sig)) {
      throw Object.assign(new Error('Berkas ditolak: terdeteksi script atau payload berbahaya di dalam berkas.'), { status: 400 });
    }
  }
  if (/<svg[\s>/]/i.test(latin1Content)) {
    throw Object.assign(new Error('Berkas ditolak: format SVG tidak diizinkan demi keamanan.'), { status: 400 });
  }

  // 4. Strict MIME Type Detection from Magic Bytes
  const mimeType = detectQuestionImageMime(buffer);
  if (!mimeType) {
    throw Object.assign(new Error('Isi berkas tidak cocok dengan format gambar JPG, PNG, atau WebP yang valid.'), { status: 400 });
  }

  // Structural integrity check
  if (mimeType === 'image/png') {
    if (buffer.length >= 16 && buffer.toString('ascii', 12, 16) !== 'IHDR') {
      throw Object.assign(new Error('Struktur berkas PNG tidak valid atau rusak.'), { status: 400 });
    }
  } else if (mimeType === 'image/webp') {
    if (buffer.length >= 16) {
      const chunkType = buffer.toString('ascii', 12, 16);
      if (!['VP8 ', 'VP8L', 'VP8X'].includes(chunkType)) {
        throw Object.assign(new Error('Struktur berkas WebP tidak valid atau rusak.'), { status: 400 });
      }
    }
  }

  // 5. Strict Extension vs Content Verification
  const isJpgExt = rawExt === 'jpg' || rawExt === 'jpeg';
  const isPngExt = rawExt === 'png';
  const isWebpExt = rawExt === 'webp';

  if (mimeType === 'image/jpeg' && !isJpgExt) {
    throw Object.assign(new Error(`Ekstensi .${rawExt} tidak cocok dengan isi berkas (gambar JPG).`), { status: 400 });
  }
  if (mimeType === 'image/png' && !isPngExt) {
    throw Object.assign(new Error(`Ekstensi .${rawExt} tidak cocok dengan isi berkas (gambar PNG).`), { status: 400 });
  }
  if (mimeType === 'image/webp' && !isWebpExt) {
    throw Object.assign(new Error(`Ekstensi .${rawExt} tidak cocok dengan isi berkas (gambar WebP).`), { status: 400 });
  }

  return {
    ok: true,
    mimeType,
    extension: questionImageExtension(mimeType),
  };
}
