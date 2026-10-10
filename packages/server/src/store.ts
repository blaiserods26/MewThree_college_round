import fs from "node:fs";
import path from "node:path";
import type { AuditEvent, Patch, Release, VerificationRun, Website } from "@patchwork/contracts";

export interface DatabaseSchema {
  websites: Record<string, Website>;
  patches: Record<string, Patch>;
  releases: Record<string, Release>;
  auditEvents: AuditEvent[];
  verificationRuns: VerificationRun[];
}

export class JsonFileStore {
  private filePath: string;
  private data: DatabaseSchema;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), "data", "patchwork-db.json");
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          websites: parsed.websites || {},
          patches: parsed.patches || {},
          releases: parsed.releases || {},
          auditEvents: parsed.auditEvents || [],
          verificationRuns: parsed.verificationRuns || [],
        };
      }
    } catch (err) {
      console.warn("Failed to read database file, initializing empty:", err);
    }
    return {
      websites: {
        "demo-store": {
          id: "demo-store",
          name: "AeroStyle Storefront",
          baseUrl: "http://localhost:3000",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      patches: {},
      releases: {},
      auditEvents: [],
      verificationRuns: [],
    };
  }

  public save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save database file:", err);
    }
  }

  public getWebsites(): Website[] {
    return Object.values(this.data.websites);
  }

  public getWebsite(id: string): Website | undefined {
    return this.data.websites[id];
  }

  public saveWebsite(website: Website): void {
    this.data.websites[website.id] = website;
    this.save();
  }

  public getPatches(): Patch[] {
    return Object.values(this.data.patches);
  }

  public getPatch(id: string): Patch | undefined {
    return this.data.patches[id];
  }

  public savePatch(patch: Patch): void {
    this.data.patches[patch.id] = patch;
    this.save();
  }

  public getReleases(): Release[] {
    return Object.values(this.data.releases);
  }

  public getRelease(id: string): Release | undefined {
    return this.data.releases[id];
  }

  public saveRelease(release: Release): void {
    this.data.releases[release.id] = release;
    this.save();
  }

  public saveReleases(releases: Release[]): void {
    for (const r of releases) {
      this.data.releases[r.id] = r;
    }
    this.save();
  }

  public getAuditEvents(): AuditEvent[] {
    return this.data.auditEvents;
  }

  public addAuditEvent(event: AuditEvent): void {
    this.data.auditEvents.unshift(event); // newest first
    this.save();
  }

  public getVerificationRuns(patchId?: string): VerificationRun[] {
    if (patchId) {
      return this.data.verificationRuns.filter((r) => r.patchId === patchId);
    }
    return this.data.verificationRuns;
  }

  public getVerificationRun(runId: string): VerificationRun | undefined {
    return this.data.verificationRuns.find((r) => r.id === runId);
  }

  public saveVerificationRun(run: VerificationRun): void {
    this.data.verificationRuns.unshift(run); // newest first
    this.save();
  }
}
