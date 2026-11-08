import { IEvidenceRepository } from './IEvidenceRepository';
import { db, ResolveOneDB } from '../db';
import { EvidenceBlobRecord } from '../types';

export class DexieEvidenceRepository implements IEvidenceRepository {
  private database: ResolveOneDB;

  constructor(database: ResolveOneDB = db) {
    this.database = database;
  }

  async calculateSHA256(data: ArrayBuffer): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return '';
  }

  async saveBlob(
    file: File | Blob,
    metadata: { id: string; name: string; type: string; size: number }
  ): Promise<EvidenceBlobRecord> {
    const arrayBuffer = await file.arrayBuffer();
    const sha256 = await this.calculateSHA256(arrayBuffer);

    const record: EvidenceBlobRecord = {
      id: metadata.id,
      blob: file.slice(0, file.size, file.type),
      name: metadata.name,
      type: metadata.type,
      size: metadata.size,
      sha256,
      at: new Date().toISOString(),
    };

    await this.database.evidenceBlobs.put(record);
    return record;
  }

  async getBlob(id: string): Promise<EvidenceBlobRecord | undefined> {
    return this.database.evidenceBlobs.get(id);
  }

  async deleteBlob(id: string): Promise<void> {
    await this.database.evidenceBlobs.delete(id);
  }

  async clearAll(): Promise<void> {
    await this.database.evidenceBlobs.clear();
  }
}

