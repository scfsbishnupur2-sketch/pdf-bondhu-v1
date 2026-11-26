/**
 * ONEORA Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Run with @firebase/rules-unit-testing against the Firebase Firestore Emulator.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED' | 'ALLOW';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Cross-User PII Read on /users/{userId}',
    operation: 'get',
    path: '/users/userA',
    auth: { uid: 'userB', email: 'b@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Write Blocked',
    operation: 'create',
    path: '/users/userA',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: false },
    payload: {
      ownerId: 'userA',
      displayName: 'User A',
      language: 'en',
      theme: 'system',
      updatedAtMs: 1700000000000,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing (ownerId mismatch) on Planner Create',
    operation: 'create',
    path: '/users/userA/planner/item1',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      ownerId: 'userB',
      kind: 'task',
      title: 'Spoofed',
      dateKey: '2026-11-26',
      status: 'active',
      updatedAtMs: 1700000000000,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection (Ghost Field isAdmin/plan)',
    operation: 'create',
    path: '/users/userA',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      ownerId: 'userA',
      displayName: 'User A',
      language: 'en',
      theme: 'light',
      updatedAtMs: 1700000000000,
      isAdmin: true,
      plan: 'pro',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Path ID Poisoning (Invalid Chars / Oversized ID)',
    operation: 'create',
    path: '/users/userA/planner/' + 'a'.repeat(150),
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      ownerId: 'userA',
      kind: 'note',
      title: 'Long ID',
      dateKey: '2026-11-26',
      status: 'active',
      updatedAtMs: 1700000000000,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Subcollection Write Without Parent UserProfile',
    operation: 'create',
    path: '/users/userOrphan/finance/fin1',
    auth: { uid: 'userOrphan', email: 'o@example.com', email_verified: true },
    payload: {
      ownerId: 'userOrphan',
      recordType: 'expense',
      title: 'Coffee',
      amount: 120,
      category: 'Food',
      dateKey: '2026-11-26',
      status: 'active',
      updatedAtMs: 1700000000000,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Client Timestamp Forgery (createdAt != request.time)',
    operation: 'create',
    path: '/users/userA/finance/fin2',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      ownerId: 'userA',
      recordType: 'expense',
      title: 'Backdated',
      amount: 50,
      category: 'Food',
      dateKey: '2026-11-26',
      status: 'active',
      updatedAtMs: 1700000000000,
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immortal Field Mutation (Altering ownerId/createdAt on Update)',
    operation: 'update',
    path: '/users/userA/planner/item1',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      ownerId: 'userB',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal State Tampering (Updating archived PlannerItem)',
    operation: 'update',
    path: '/users/userA/planner/archivedItem',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      status: 'active',
      title: 'Reopened',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Allowed Key (10KB Title)',
    operation: 'update',
    path: '/users/userA/planner/item1',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      title: 'X'.repeat(10000),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Array Exhaustion on quickActions (> 10 entries)',
    operation: 'update',
    path: '/users/userA',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      quickActions: Array.from({ length: 20 }, (_, i) => `tool_${i}`),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Cross-User Finance List Scraping',
    operation: 'list',
    path: '/users/userA/finance',
    auth: { uid: 'userB', email: 'b@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
