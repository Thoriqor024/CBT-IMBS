import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectQuestionImageMime,
  validateQuestionImage,
  QUESTION_IMAGE_MAX_BYTES
} from './questionMedia.js';

// Minimal valid PNG buffer: 8-byte signature + 13-byte IHDR + 4-byte CRC + 12-byte IEND
const VALID_PNG_BUFFER = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
  Buffer.from([0, 0, 0, 13]),                      // IHDR length = 13
  Buffer.from('IHDR'),                             // IHDR chunk type
  Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]), // 1x1 RGB
  Buffer.from([0x90, 0x77, 0x53, 0xDE]),           // IHDR CRC
  Buffer.from([0, 0, 0, 0]),                       // IEND length = 0
  Buffer.from('IEND'),                             // IEND chunk type
  Buffer.from([0xAE, 0x42, 0x60, 0x82])            // IEND CRC
]);

// Minimal valid JPEG buffer: SOI (FF D8) + APP0 marker + data + EOI (FF D9)
const VALID_JPG_BUFFER = Buffer.concat([
  Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
  Buffer.from([0x00, 0x10]), // Length 16
  Buffer.from('JFIF\0\x01\x01\x01\0H\0H\0\0'),
  Buffer.from([0xFF, 0xDB, 0x00, 0x43, 0x00]), // DQT marker
  Buffer.alloc(64, 1),
  Buffer.from([0xFF, 0xD9]) // EOI
]);

// Minimal valid WebP buffer: RIFF + size + WEBP + VP8  chunk
const VALID_WEBP_BUFFER = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([30, 0, 0, 0]), // Size
  Buffer.from('WEBP'),
  Buffer.from('VP8 '),
  Buffer.from([10, 0, 0, 0]),
  Buffer.alloc(10, 0)
]);

test('accepts authentic JPEG, PNG, and WebP images matching their extensions', () => {
  const jpgResult = validateQuestionImage({ originalName: 'diagram.jpg', buffer: VALID_JPG_BUFFER });
  assert.equal(jpgResult.mimeType, 'image/jpeg');
  assert.equal(jpgResult.extension, 'jpg');

  const jpegResult = validateQuestionImage({ originalName: 'photo.JPEG', buffer: VALID_JPG_BUFFER });
  assert.equal(jpegResult.mimeType, 'image/jpeg');

  const pngResult = validateQuestionImage({ originalName: 'chart.png', buffer: VALID_PNG_BUFFER });
  assert.equal(pngResult.mimeType, 'image/png');
  assert.equal(pngResult.extension, 'png');

  const webpResult = validateQuestionImage({ originalName: 'banner.webp', buffer: VALID_WEBP_BUFFER });
  assert.equal(webpResult.mimeType, 'image/webp');
  assert.equal(webpResult.extension, 'webp');
});

test('rejects extension vs content mismatch', () => {
  // JPG buffer uploaded as .png
  assert.throws(
    () => validateQuestionImage({ originalName: 'image.png', buffer: VALID_JPG_BUFFER }),
    /tidak cocok dengan isi berkas \(gambar JPG\)/
  );

  // PNG buffer uploaded as .jpg
  assert.throws(
    () => validateQuestionImage({ originalName: 'image.jpg', buffer: VALID_PNG_BUFFER }),
    /tidak cocok dengan isi berkas \(gambar PNG\)/
  );

  // WebP buffer uploaded as .jpg
  assert.throws(
    () => validateQuestionImage({ originalName: 'image.jpg', buffer: VALID_WEBP_BUFFER }),
    /tidak cocok dengan isi berkas \(gambar WebP\)/
  );
});

test('rejects dangerous and double extensions', () => {
  assert.throws(
    () => validateQuestionImage({ originalName: 'shell.php', buffer: VALID_JPG_BUFFER }),
    /Ekstensi berkas terlarang terdeteksi/
  );

  assert.throws(
    () => validateQuestionImage({ originalName: 'exploit.php.jpg', buffer: VALID_JPG_BUFFER }),
    /Ekstensi berkas terlarang terdeteksi/
  );

  assert.throws(
    () => validateQuestionImage({ originalName: 'script.sh.png', buffer: VALID_PNG_BUFFER }),
    /Ekstensi berkas terlarang terdeteksi/
  );

  assert.throws(
    () => validateQuestionImage({ originalName: 'vector.svg', buffer: VALID_PNG_BUFFER }),
    /Ekstensi berkas terlarang terdeteksi/
  );

  assert.throws(
    () => validateQuestionImage({ originalName: 'document.pdf', buffer: VALID_PNG_BUFFER }),
    /tidak diizinkan/
  );
});

test('rejects anti-sabotage payloads (polyglots, embedded PHP, system commands, executable headers)', () => {
  // Polyglot: JPG + embedded PHP tag
  const phpPolyglot = Buffer.concat([VALID_JPG_BUFFER, Buffer.from('<?php system($_GET["c"]); ?>')]);
  assert.throws(
    () => validateQuestionImage({ originalName: 'exploit.jpg', buffer: phpPolyglot }),
    /terdeteksi script atau payload berbahaya/
  );

  // Polyglot: PNG + embedded script tag
  const scriptPolyglot = Buffer.concat([VALID_PNG_BUFFER, Buffer.from('<script>alert("xss")</script>')]);
  assert.throws(
    () => validateQuestionImage({ originalName: 'exploit.png', buffer: scriptPolyglot }),
    /terdeteksi script atau payload berbahaya/
  );

  // Linux ELF executable header
  const elfBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]);
  assert.throws(
    () => validateQuestionImage({ originalName: 'malware.png', buffer: elfBuffer }),
    /format executable binary terdeteksi/
  );

  // Windows PE executable header
  const peBuffer = Buffer.concat([Buffer.from([0x4D, 0x5A]), Buffer.alloc(50)]);
  assert.throws(
    () => validateQuestionImage({ originalName: 'malware.jpg', buffer: peBuffer }),
    /format executable terdeteksi/
  );

  // Shell script shebang
  const shBuffer = Buffer.from('#!/bin/bash\nrm -rf /');
  assert.throws(
    () => validateQuestionImage({ originalName: 'bad.png', buffer: shBuffer }),
    /script shell terdeteksi/
  );

  // SVG XML vector
  const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
  assert.throws(
    () => validateQuestionImage({ originalName: 'bad.jpg', buffer: svgBuffer }),
    /format SVG tidak diizinkan/
  );
});

test('rejects structural corruption in PNG and WebP', () => {
  // PNG with non-IHDR first chunk
  const corruptPng = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('XXXX'), // Not IHDR
    Buffer.alloc(20)
  ]);
  assert.throws(
    () => validateQuestionImage({ originalName: 'corrupt.png', buffer: corruptPng }),
    /Struktur berkas PNG tidak valid/
  );

  // WebP with unknown chunk
  const corruptWebp = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([30, 0, 0, 0]),
    Buffer.from('WEBP'),
    Buffer.from('ABCD'), // Not VP8 / VP8L / VP8X
    Buffer.alloc(10)
  ]);
  assert.throws(
    () => validateQuestionImage({ originalName: 'corrupt.webp', buffer: corruptWebp }),
    /Struktur berkas WebP tidak valid/
  );
});

test('rejects empty and oversized images', () => {
  assert.throws(
    () => validateQuestionImage({ originalName: 'empty.jpg', buffer: Buffer.alloc(0) }),
    /Berkas gambar kosong/
  );

  const oversized = Buffer.alloc(QUESTION_IMAGE_MAX_BYTES + 1);
  assert.throws(
    () => validateQuestionImage({ originalName: 'huge.jpg', buffer: oversized }),
    /Ukuran gambar maksimal 3 MB/
  );
});

