
export type ContentKind =
  | "puzzle"
  | "lesson"
  | "campaign"
  | "skill-graph"
  | "premium-policy"
  | "localization"
  | "asset-manifest";

export type ContentStatus = "draft" | "review" | "published" | "archived";

export interface ContentReference {
  readonly kind: ContentKind;
  readonly id: string;
  readonly version?: string;
  readonly optional?: boolean;
}

export interface ContentResource<T = unknown> {
  readonly schemaVersion: number;
  readonly kind: ContentKind;
  readonly id: string;
  readonly version: string;
  readonly status: ContentStatus;
  readonly title: string;
  readonly tags: readonly string[];
  readonly dependencies: readonly ContentReference[];
  readonly payload: T;
}

export interface ContentPack {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly title: string;
  readonly minimumEngineVersion: string;
  readonly createdAt: number;
  readonly resources: readonly ContentResource[];
  readonly integrity?: string;
}

export interface ContentIssue {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly path: string;
  readonly message: string;
}

export interface ContentValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ContentIssue[];
}

export interface ContentCatalogEntry {
  readonly key: string;
  readonly packId: string;
  readonly packVersion: string;
  readonly kind: ContentKind;
  readonly id: string;
  readonly version: string;
  readonly status: ContentStatus;
  readonly title: string;
  readonly tags: readonly string[];
}

export interface ContentCatalog {
  readonly schemaVersion: 1;
  readonly entries: readonly ContentCatalogEntry[];
}

export interface PublishingTransition {
  readonly pack: ContentPack;
  readonly events: readonly ContentPlatformEvent[];
}

export type ContentPlatformEvent =
  | { readonly type: "pack-validated"; readonly packId: string; readonly valid: boolean }
  | { readonly type: "resource-status-changed"; readonly resourceKey: string; readonly from: ContentStatus; readonly to: ContentStatus }
  | { readonly type: "pack-published"; readonly packId: string; readonly version: string }
  | { readonly type: "resource-migrated"; readonly resourceKey: string; readonly fromSchemaVersion: number; readonly toSchemaVersion: number }
  | { readonly type: "catalog-built"; readonly entryCount: number };

export interface MigrationContext {
  readonly packId: string;
  readonly resourceKind: ContentKind;
  readonly resourceId: string;
}

export interface ContentMigration {
  readonly kind: ContentKind;
  readonly fromSchemaVersion: number;
  readonly toSchemaVersion: number;
  migrate(payload: unknown, context: MigrationContext): unknown;
}

export interface MigrationResult {
  readonly resource: ContentResource;
  readonly events: readonly ContentPlatformEvent[];
}

export interface ContentQuery {
  readonly kinds?: readonly ContentKind[];
  readonly statuses?: readonly ContentStatus[];
  readonly tags?: readonly string[];
  readonly text?: string;
  readonly packId?: string;
}

export interface CompatibilityResult {
  readonly compatible: boolean;
  readonly issues: readonly ContentIssue[];
}

export interface CrossMathContentPlatformContract {
  validatePack(pack: ContentPack): ContentValidationResult;
  verifyIntegrity(pack: ContentPack): boolean;
  seal(pack: ContentPack): ContentPack;
  changeResourceStatus(pack: ContentPack, kind: ContentKind, id: string, status: ContentStatus): PublishingTransition;
  publish(pack: ContentPack): PublishingTransition;
  migrateResource(packId: string, resource: ContentResource, targetSchemaVersion: number): MigrationResult;
  buildCatalog(packs: readonly ContentPack[]): ContentCatalog;
  query(catalog: ContentCatalog, query: ContentQuery): readonly ContentCatalogEntry[];
  checkCompatibility(pack: ContentPack, engineVersion: string): CompatibilityResult;
  serializePack(pack: ContentPack): string;
  restorePack(serialized: string): ContentPack;
}
