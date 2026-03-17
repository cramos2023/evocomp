import { EvidenceBundle, EvidenceSource } from '../types/evidence';

export class EvidenceBundleBuilder {
  private sources: EvidenceSource[] = [];

  constructor(private tenantId: string, private userId: string) {}

  addSource(source: EvidenceSource): this {
    this.sources.push(source);
    return this;
  }

  /**
   * Normalizes the gathered evidence into a structured bundle for the LLM.
   */
  build(contextScope: string[]): EvidenceBundle {
    const bundle: EvidenceBundle = {
      id: this.generateHash(),
      sources: [...this.sources],
      metadata: {
        tenantId: this.tenantId,
        userId: this.userId,
        contextScope,
        generatedAt: new Date().toISOString(),
      },
    };
    return bundle;
  }

  /**
   * Generates a simple hash of the sources to identify the bundle.
   * In a real app, this would be a more robust SHA-256 hash of the JSON string.
   */
  private generateHash(): string {
    const serialized = JSON.stringify(this.sources);
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `EBB-${Math.abs(hash).toString(16)}-${Date.now().toString(36)}`;
  }

  clear(): void {
    this.sources = [];
  }
}
