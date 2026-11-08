import { EvidenceBlobRecord } from '../types';

export interface IEvidenceRepository {
  saveBlob(file: File | Blob, metadata: { id: string; name: string; type: string; size: number }): Promise<EvidenceBlobRecord>;
  getBlob(id: string): Promise<EvidenceBlobRecord | undefined>;
  deleteBlob(id: string): Promise<void>;
  calculateSHA256(data: ArrayBuffer): Promise<string>;
  clearAll(): Promise<void>;
}

