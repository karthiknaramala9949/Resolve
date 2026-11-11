import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Reusable nested validators
const ThreeStateOutcomeValidator = v.optional(
  v.object({
    companyStated: v.optional(
      v.object({
        date: v.optional(v.string()),
        amount: v.optional(v.number()),
        note: v.optional(v.string()),
      })
    ),
    evidenceFound: v.optional(
      v.object({
        date: v.optional(v.string()),
        reference: v.optional(v.string()),
        note: v.optional(v.string()),
      })
    ),
    customerConfirmed: v.optional(
      v.object({
        date: v.optional(v.string()),
        amountReceived: v.optional(v.number()),
        note: v.optional(v.string()),
      })
    ),
  })
);

const TimelineEventValidator = v.object({
  id: v.string(),
  at: v.string(),
  title: v.string(),
  detail: v.string(),
  source: v.string(),
});

const EvidenceMetaValidator = v.object({
  id: v.string(),
  name: v.string(),
  mime: v.string(),
  size: v.number(),
  source: v.string(),
  addedAt: v.string(),
  sha256: v.optional(v.string()),
  redactionHint: v.optional(v.string()),
  storageId: v.optional(v.string()),
  encryptedKey: v.optional(v.string()),
  iv: v.optional(v.string()),
});

export default defineSchema({
  // =========================================================================
  // PHASE 2 TARGET SCHEMAS (Convex + Better Auth Architecture)
  // Better Auth internal tables (user, session, account, verification)
  // are managed in the component namespace and not duplicated here.
  // =========================================================================

  // 1. User Profiles (Extends Better Auth user with consumer dispute details)
  profiles: defineTable({
    userId: v.string(), // Foreign key to Better Auth user ID
    name: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    phoneNumber: v.optional(v.union(v.string(), v.null())),
    image: v.optional(v.union(v.string(), v.null())),
    role: v.string(), // 'consumer' | 'admin'
    phoneVerified: v.boolean(),
    phoneVerifiedAt: v.optional(v.union(v.string(), v.null())),
    preferences: v.optional(
      v.object({
        theme: v.optional(v.string()),
        simpleLanguageMode: v.optional(v.boolean()),
        notificationsEnabled: v.optional(v.boolean()),
      })
    ),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_userId', ['userId'])
    .index('by_email', ['email'])
    .index('by_phone', ['phoneNumber']),

  // 2. User Cryptographic Bundles (Zero-Knowledge User Master Key & Recovery)
  user_crypto: defineTable({
    userId: v.string(), // Foreign key to Better Auth user ID
    encryptedMasterKey: v.string(), // Master Key wrapped with passphrase KEK
    masterKeySalt: v.string(), // Hex salt for key derivation
    masterKeyIv: v.string(), // Hex IV (12 bytes)
    keyDerivationAlgo: v.string(), // 'argon2id' | 'pbkdf2_sha512'
    argon2Params: v.optional(
      v.object({
        memory: v.number(),
        iterations: v.number(),
        parallelism: v.number(),
      })
    ),
    recoveryKeyHash: v.optional(v.string()), // SHA-256 hash of recovery key
    recoveryWrappedMasterKey: v.optional(v.string()), // Master Key wrapped with recovery key
    keyVersion: v.number(), // Key version counter (for rotation)
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index('by_userId', ['userId']),

  // 3. Dispute Cases
  cases: defineTable({
    userId: v.union(v.string(), v.id('users')), // Supports Better Auth string ID & legacy Id<'users'>
    clientGeneratedId: v.optional(v.string()), // e.g. RS-00492 for offline IndexedDB sync
    title: v.string(),
    issueType: v.string(),
    company: v.string(),
    orderRef: v.optional(v.string()),
    product: v.optional(v.string()),
    amount: v.optional(v.union(v.number(), v.null())),
    purchasedAt: v.optional(v.string()),
    desiredOutcome: v.optional(v.string()),
    description: v.string(),
    status: v.string(), // 'action_required' | 'waiting_company' | 'response_received' | 'resolved' | 'closed'
    isArchived: v.optional(v.boolean()),
    nextAction: v.optional(v.string()),
    nextStepReason: v.optional(v.string()),
    claimedOutcome: v.optional(v.string()),
    customerConfirmedOutcome: v.optional(v.string()),
    threeStateOutcome: ThreeStateOutcomeValidator,
    timeline: v.array(TimelineEventValidator),
    evidence: v.array(EvidenceMetaValidator),
    tags: v.optional(v.array(v.string())),
    assignee: v.optional(v.string()),
    customerNotes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    deletedAt: v.optional(v.string()),
    version: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_user_updatedAt', ['userId', 'updatedAt'])
    .index('by_client_id', ['clientGeneratedId'])
    .index('by_user_client_id', ['userId', 'clientGeneratedId'])
    .searchIndex('search_cases', {
      searchField: 'title',
      filterFields: ['userId', 'status', 'company'],
    }),

  // 4. Case Events (Individual granular timeline events)
  case_events: defineTable({
    userId: v.string(),
    caseId: v.string(), // Case reference ID
    eventId: v.string(),
    at: v.string(),
    title: v.string(),
    detail: v.string(),
    source: v.string(), // 'customer' | 'company' | 'evidence' | 'system' | 'reminder'
    createdAt: v.string(),
  })
    .index('by_case', ['caseId'])
    .index('by_user', ['userId'])
    .index('by_user_case', ['userId', 'caseId']),

  // 5. Evidence & Encrypted Documents
  evidence: defineTable({
    userId: v.string(),
    caseId: v.optional(v.union(v.string(), v.null())),
    folderId: v.optional(v.union(v.string(), v.null())),
    clientGeneratedId: v.optional(v.string()),
    name: v.string(),
    mime: v.string(),
    size: v.number(),
    sha256: v.string(),
    storageId: v.string(), // Convex Storage ID of encrypted ciphertext
    isEncrypted: v.boolean(),
    encryptedKey: v.optional(v.string()), // Wrapped DEK
    iv: v.optional(v.string()), // AES-GCM IV (hex)
    salt: v.optional(v.string()),
    keyVersion: v.optional(v.number()),
    redactionHint: v.optional(v.string()),
    version: v.number(),
    isArchived: v.optional(v.boolean()),
    createdAt: v.string(),
    updatedAt: v.string(),
    deletedAt: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_case', ['caseId'])
    .index('by_user_case', ['userId', 'caseId'])
    .index('by_sha256', ['sha256']),

  // 6. Reminders & Statutory Milestones
  reminders: defineTable({
    userId: v.union(v.string(), v.id('users')),
    clientGeneratedId: v.optional(v.string()),
    caseId: v.optional(v.string()),
    title: v.string(),
    date: v.string(),
    done: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
    deletedAt: v.optional(v.string()),
    version: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_done', ['userId', 'done'])
    .index('by_case', ['caseId'])
    .index('by_client_id', ['clientGeneratedId'])
    .index('by_user_client_id', ['userId', 'clientGeneratedId']),

  // 7. Notifications
  notifications: defineTable({
    userId: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.string(), // 'info' | 'warning' | 'success' | 'reminder'
    read: v.boolean(),
    link: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_user_read', ['userId', 'read']),

  // 8. Multi-Device Registration & Sync
  sync_devices: defineTable({
    userId: v.string(),
    deviceId: v.string(),
    deviceName: v.string(),
    deviceType: v.string(), // 'mobile' | 'desktop' | 'tablet' | 'browser'
    clientVersion: v.optional(v.string()),
    publicKey: v.optional(v.string()),
    lastSyncAt: v.string(),
    createdAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_device', ['deviceId'])
    .index('by_user_device', ['userId', 'deviceId']),

  // 9. Sync Operations (Idempotency and Conflict Log)
  sync_operations: defineTable({
    userId: v.string(),
    operationId: v.string(), // Client idempotency ID (e.g. SQ-1234)
    deviceId: v.optional(v.string()),
    entity: v.string(), // 'cases' | 'evidence' | 'purchases' | 'reminders'
    action: v.string(), // 'create' | 'update' | 'delete'
    clientGeneratedId: v.string(),
    dataHash: v.optional(v.string()),
    status: v.string(), // 'applied' | 'rejected' | 'conflict_resolved'
    processedAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_operation', ['operationId'])
    .index('by_user_operation', ['userId', 'operationId']),

  // 10. Consents (DPDP Act & Legal Consent Log)
  consents: defineTable({
    userId: v.string(),
    consentType: v.string(), // 'terms_of_service' | 'privacy_policy' | 'dpdp_act_data_processing'
    version: v.string(), // e.g. 'v1.0'
    granted: v.boolean(),
    grantedAt: v.string(),
    revokedAt: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_type', ['userId', 'consentType']),

  // 11. Security Audit Logs
  audit_logs: defineTable({
    userId: v.string(),
    entityType: v.string(), // 'case' | 'evidence' | 'auth' | 'purchase' | 'reminder' | 'crypto' | 'consent'
    entityId: v.string(),
    action: v.string(), // 'create' | 'update' | 'delete' | 'upload' | 'download' | 'login' | 'logout' | 'key_rotate'
    details: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_entity', ['entityType', 'entityId'])
    .index('by_timestamp', ['timestamp']),

  // =========================================================================
  // TRANSITIONAL TABLES (Preserved for Backward Compatibility during Migration)
  // These tables ensure existing code, tests, and active endpoints continue
  // operating uninterrupted while Phase 2 endpoints are integrated.
  // =========================================================================

  users: defineTable({
    name: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    phoneNumber: v.optional(v.union(v.string(), v.null())),
    image: v.optional(v.union(v.string(), v.null())),
    providers: v.array(v.string()),
    passwordHash: v.optional(v.union(v.string(), v.null())),
    passwordSalt: v.optional(v.union(v.string(), v.null())),
    googleId: v.optional(v.union(v.string(), v.null())),
    emailVerified: v.boolean(),
    emailVerifiedAt: v.optional(v.union(v.string(), v.null())),
    phoneVerified: v.boolean(),
    phoneVerifiedAt: v.optional(v.union(v.string(), v.null())),
    role: v.optional(v.string()),
    encryptedMasterKey: v.optional(v.string()),
    masterKeySalt: v.optional(v.string()),
    masterKeyIv: v.optional(v.string()),
    recoveryKeyHash: v.optional(v.string()),
    recoveryWrappedMasterKey: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        theme: v.optional(v.string()),
        simpleLanguageMode: v.optional(v.boolean()),
        notificationsEnabled: v.optional(v.boolean()),
      })
    ),
    createdAt: v.string(),
    updatedAt: v.string(),
    lastLoginAt: v.string(),
  })
    .index('by_email', ['email'])
    .index('by_phone', ['phoneNumber'])
    .index('by_googleId', ['googleId']),

  sessions: defineTable({
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.string(),
    createdAt: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  })
    .index('by_token', ['token'])
    .index('by_user', ['userId']),

  verificationTokens: defineTable({
    identifier: v.string(),
    token: v.string(),
    type: v.string(),
    expiresAt: v.string(),
    attempts: v.number(),
    createdAt: v.string(),
  })
    .index('by_identifier_type', ['identifier', 'type'])
    .index('by_token', ['token']),

  documents: defineTable({
    userId: v.union(v.string(), v.id('users')),
    caseId: v.optional(v.union(v.id('cases'), v.null())),
    folderId: v.optional(v.union(v.id('folders'), v.null())),
    clientGeneratedId: v.optional(v.string()),
    name: v.string(),
    mime: v.string(),
    size: v.number(),
    sha256: v.string(),
    storageId: v.string(),
    isEncrypted: v.boolean(),
    encryptedKey: v.optional(v.string()),
    iv: v.optional(v.string()),
    salt: v.optional(v.string()),
    version: v.number(),
    isArchived: v.optional(v.boolean()),
    redactionHint: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    deletedAt: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_case', ['caseId'])
    .index('by_folder', ['folderId'])
    .index('by_sha256', ['sha256']),

  folders: defineTable({
    userId: v.union(v.string(), v.id('users')),
    name: v.string(),
    color: v.optional(v.string()),
    parentId: v.optional(v.union(v.id('folders'), v.null())),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index('by_user', ['userId']),

  purchases: defineTable({
    userId: v.union(v.string(), v.id('users')),
    clientGeneratedId: v.optional(v.string()),
    store: v.string(),
    product: v.string(),
    orderRef: v.optional(v.string()),
    amount: v.optional(v.union(v.number(), v.null())),
    purchaseDate: v.optional(v.string()),
    deliveryDate: v.optional(v.string()),
    returnWindowDays: v.number(),
    warrantyMonths: v.number(),
    notes: v.optional(v.string()),
    serialNo: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    deletedAt: v.optional(v.string()),
    version: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_client_id', ['clientGeneratedId']),

  devices: defineTable({
    userId: v.union(v.string(), v.id('users')),
    deviceId: v.string(),
    deviceName: v.string(),
    deviceType: v.string(),
    publicKey: v.optional(v.string()),
    lastSyncAt: v.string(),
    createdAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_device', ['deviceId']),

  activityLogs: defineTable({
    userId: v.union(v.string(), v.id('users')),
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    details: v.string(),
    ipAddress: v.optional(v.string()),
    timestamp: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_entity', ['entityType', 'entityId']),

  caseCategories: defineTable({
    code: v.string(),
    name: v.string(),
    statutoryAct: v.string(),
    sectionRef: v.string(),
    description: v.string(),
    defaultWindowDays: v.number(),
  }).index('by_code', ['code']),
});
