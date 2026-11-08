// Zero-dependency client-side ZIP generator (PKZIP Store format)
// Enables native offline zip export of dispute records and evidence files

interface ZipEntry {
  filename: string;
  data: Uint8Array;
}

export function createZipArchive(entries: ZipEntry[]): Blob {
  const parts: Uint8Array[] = [];
  const centralDirEntries: Uint8Array[] = [];
  let offset = 0;

  // CRC-32 table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }

  function crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  for (const entry of entries) {
    const filenameBytes = new TextEncoder().encode(entry.filename);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + filenameBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // Local header signature 'PK\x03\x04'
    view.setUint16(4, 20, true);         // Version needed to extract (2.0)
    view.setUint16(6, 0, true);          // General purpose bit flag
    view.setUint16(8, 0, true);          // Compression method (0 = store)
    view.setUint16(10, 0, true);         // File last mod time
    view.setUint16(12, 0, true);         // File last mod date
    view.setUint32(14, crc, true);       // CRC-32
    view.setUint32(18, size, true);      // Compressed size
    view.setUint32(22, size, true);      // Uncompressed size
    view.setUint16(26, filenameBytes.length, true); // Filename length
    view.setUint16(28, 0, true);         // Extra field length
    localHeader.set(filenameBytes, 30);

    parts.push(localHeader);
    parts.push(entry.data);

    // Central directory header (46 bytes + filename)
    const cdHeader = new Uint8Array(46 + filenameBytes.length);
    const cdView = new DataView(cdHeader.buffer);

    cdView.setUint32(0, 0x02014b50, true); // Central directory header 'PK\x01\x02'
    cdView.setUint16(4, 20, true);          // Version made by
    cdView.setUint16(6, 20, true);          // Version needed
    cdView.setUint16(8, 0, true);           // Bit flag
    cdView.setUint16(10, 0, true);          // Compression method (0 = store)
    cdView.setUint16(12, 0, true);          // Last mod time
    cdView.setUint16(14, 0, true);          // Last mod date
    cdView.setUint32(16, crc, true);        // CRC-32
    cdView.setUint32(20, size, true);       // Compressed size
    cdView.setUint32(24, size, true);       // Uncompressed size
    cdView.setUint16(28, filenameBytes.length, true); // Filename length
    cdView.setUint16(30, 0, true);          // Extra field length
    cdView.setUint16(32, 0, true);          // File comment length
    cdView.setUint16(34, 0, true);          // Disk number start
    cdView.setUint16(36, 0, true);          // Internal file attributes
    cdView.setUint32(38, 0, true);          // External file attributes
    cdView.setUint32(42, offset, true);     // Relative offset of local header
    cdHeader.set(filenameBytes, 46);

    centralDirEntries.push(cdHeader);
    offset += localHeader.length + size;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDirEntries) {
    parts.push(cd);
    cdSize += cd.length;
  }

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // 'PK\x05\x06'
  eocdView.setUint16(4, 0, true);          // Disk number
  eocdView.setUint16(6, 0, true);          // Start disk
  eocdView.setUint16(8, entries.length, true);  // Number of central directory records on this disk
  eocdView.setUint16(10, entries.length, true); // Total central directory records
  eocdView.setUint32(12, cdSize, true);    // Central directory size
  eocdView.setUint32(16, cdOffset, true);  // Central directory offset
  eocdView.setUint16(20, 0, true);         // Comment length

  parts.push(eocd);

  return new Blob(parts as BlobPart[], { type: 'application/zip' });
}

