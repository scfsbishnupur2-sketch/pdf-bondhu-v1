import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

function safeId(raw: string, fallbackPrefix: string): string {
  const cleaned = String(raw || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 100);
  return cleaned || `${fallbackPrefix}_${Date.now()}`;
}

function clampStr(val: unknown, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

function clampDateKey(val: unknown): string {
  const s = String(val ?? '').trim();
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s) ? s : '';
}

function clampNum(val: unknown, min: number, max: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

type AuthListener = (user: User | null) => void;
const authListeners = new Set<AuthListener>();
let currentUser: User | null = null;
let authReady = false;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authReady = true;
  authListeners.forEach((cb) => {
    try {
      cb(user);
    } catch (err) {
      console.error('Auth listener error:', err);
    }
  });
  document.dispatchEvent(new CustomEvent('oneora:authchange', { detail: { user } }));
});

async function ensureUserProfile(user: User): Promise<void> {
  const uid = user.uid;
  const userPath = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  let localProfile: { name?: string; defaultAuthor?: string } = {};
  try {
    localProfile = JSON.parse(localStorage.getItem('pdfBondhuProfile_v2') || '{}') || {};
  } catch {
    localProfile = {};
  }

  let quickActions: string[] = [];
  try {
    const qa = JSON.parse(localStorage.getItem('oneoraQuickActions_v1') || '[]');
    if (Array.isArray(qa)) {
      quickActions = qa.filter((x) => typeof x === 'string').slice(0, 10).map((s) => s.slice(0, 60));
    }
  } catch {
    quickActions = [];
  }

  const rawLang = localStorage.getItem('pdfBondhuLang_v2') || 'en';
  const language = rawLang === 'bn' || rawLang === 'hi' ? rawLang : 'en';
  const rawTheme = localStorage.getItem('pdfBondhuThemeMode_v2') || 'system';
  const theme = rawTheme === 'light' || rawTheme === 'dark' ? rawTheme : 'system';
  const displayName = clampStr(localProfile.name || user.displayName || 'ONEORA User', 100) || 'ONEORA User';

  let existingSnap;
  try {
    existingSnap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  const basePayload: Record<string, unknown> = {
    ownerId: uid,
    displayName,
    language,
    theme,
    updatedAtMs: Date.now(),
    updatedAt: serverTimestamp(),
  };

  if (user.email) basePayload.email = clampStr(user.email, 200);
  if (localProfile.defaultAuthor) basePayload.defaultPdfAuthor = clampStr(localProfile.defaultAuthor, 100);
  if (quickActions.length > 0) basePayload.quickActions = quickActions;

  try {
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ...basePayload,
        createdAt: serverTimestamp(),
      });
    } else {
      const existingData = existingSnap.data();
      await setDoc(ref, {
        ...basePayload,
        createdAt: existingData.createdAt,
      });
    }
  } catch (error) {
    handleFirestoreError(error, existingSnap.exists() ? OperationType.UPDATE : OperationType.CREATE, userPath);
  }
}

interface SyncSummary {
  pushedPlanner: number;
  pulledPlanner: number;
  pushedFinance: number;
  pulledFinance: number;
  syncedAt: string;
}

const VALID_PLANNER_KINDS = new Set(['event', 'note', 'reminder', 'task', 'habit', 'voice_note']);
const VALID_PLANNER_REPEAT = new Set(['none', 'daily', 'weekly', 'monthly', 'yearly']);
const VALID_PLANNER_STATUS = new Set(['active', 'completed', 'snoozed', 'archived']);
const VALID_FINANCE_TYPES = new Set(['expense', 'income', 'budget', 'goal', 'debt', 'bill']);
const VALID_PAY_METHODS = new Set(['cash', 'upi', 'bank', 'debit', 'credit', 'other']);
const VALID_FINANCE_STATUS = new Set(['active', 'paid', 'completed', 'settled']);

async function syncNow(): Promise<SyncSummary> {
  if (!auth.currentUser) {
    throw new Error('Sign in with Google first to sync with ONEORA Cloud.');
  }
  if (!auth.currentUser.emailVerified) {
    throw new Error('Verified Google account email is required for cloud sync.');
  }

  const uid = auth.currentUser.uid;
  await ensureUserProfile(auth.currentUser);

  let pushedPlanner = 0;
  let pulledPlanner = 0;
  let pushedFinance = 0;
  let pulledFinance = 0;

  // 1. Sync Planner Items (Offline-first: newest updatedAtMs wins; never overwrite newer local data)
  const plannerColPath = `users/${uid}/planner`;
  const plannerCol = collection(db, 'users', uid, 'planner');
  const plannerQ = query(plannerCol, where('ownerId', '==', uid));
  let remotePlannerDocs = new Map<string, Record<string, unknown>>();
  try {
    const snap = await getDocs(plannerQ);
    snap.forEach((d) => {
      remotePlannerDocs.set(d.id, d.data() as Record<string, unknown>);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, plannerColPath);
  }

  const localPlanner: Array<Record<string, unknown>> =
    typeof (window as unknown as { OneoraPlanner?: { exportForSync?: () => Array<Record<string, unknown>> } }).OneoraPlanner?.exportForSync === 'function'
      ? (window as unknown as { OneoraPlanner: { exportForSync: () => Array<Record<string, unknown>> } }).OneoraPlanner.exportForSync()
      : [];

  const localPlannerMap = new Map<string, Record<string, unknown>>();
  for (const item of localPlanner) {
    const id = safeId(String(item.id || ''), 'pl');
    localPlannerMap.set(id, { ...item, id });
  }

  // Push newer local planner records to Firestore
  const plannerBatch = writeBatch(db);
  let plannerBatchOps = 0;
  for (const [id, item] of localPlannerMap.entries()) {
    const remote = remotePlannerDocs.get(id);
    const localMs = clampNum(item.updatedAtMs, 0, Date.now() + 86_400_000);
    const remoteMs = remote ? clampNum(remote.updatedAtMs, 0, Date.now() + 86_400_000) : 0;

    if (remote && remote.status === 'archived') continue; // Respect terminal state lock
    if (!remote || localMs > remoteMs) {
      const kind = VALID_PLANNER_KINDS.has(String(item.kind)) ? String(item.kind) : 'task';
      const status = VALID_PLANNER_STATUS.has(String(item.status)) ? String(item.status) : 'active';
      const repeat = VALID_PLANNER_REPEAT.has(String(item.repeat)) ? String(item.repeat) : 'none';
      const title = clampStr(item.title, 200) || 'Untitled';
      const payload: Record<string, unknown> = {
        ownerId: uid,
        kind,
        title,
        body: clampStr(item.body, 4000),
        dateKey: clampDateKey(item.dateKey),
        timeStr: clampStr(item.timeStr, 16),
        repeat,
        category: clampStr(item.category, 40),
        status,
        pinned: Boolean(item.pinned),
        streak: clampNum(item.streak, 0, 10000),
        updatedAtMs: localMs || Date.now(),
        createdAt: remote?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (Array.isArray(item.checklist)) {
        payload.checklist = item.checklist
          .slice(0, 30)
          .map((c) => clampStr(c, 180))
          .filter(Boolean);
      }
      plannerBatch.set(doc(db, 'users', uid, 'planner', id), payload);
      plannerBatchOps += 1;
      pushedPlanner += 1;
      if (plannerBatchOps >= 400) break;
    }
  }

  if (plannerBatchOps > 0) {
    try {
      await plannerBatch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, plannerColPath);
    }
  }

  // Pull strictly newer remote planner records into local store
  const plannerToMerge: Array<Record<string, unknown>> = [];
  for (const [id, remote] of remotePlannerDocs.entries()) {
    const local = localPlannerMap.get(id);
    const localMs = local ? clampNum(local.updatedAtMs, 0, Date.now() + 86_400_000) : 0;
    const remoteMs = clampNum(remote.updatedAtMs, 0, Date.now() + 86_400_000);
    if (!local || remoteMs > localMs) {
      plannerToMerge.push({ ...remote, id });
      pulledPlanner += 1;
    }
  }
  if (
    plannerToMerge.length > 0 &&
    typeof (window as unknown as { OneoraPlanner?: { mergeFromSync?: (items: Array<Record<string, unknown>>) => void } }).OneoraPlanner?.mergeFromSync === 'function'
  ) {
    (window as unknown as { OneoraPlanner: { mergeFromSync: (items: Array<Record<string, unknown>>) => void } }).OneoraPlanner.mergeFromSync(plannerToMerge);
  }

  // 2. Sync Finance Records
  const financeColPath = `users/${uid}/finance`;
  const financeCol = collection(db, 'users', uid, 'finance');
  const financeQ = query(financeCol, where('ownerId', '==', uid));
  let remoteFinanceDocs = new Map<string, Record<string, unknown>>();
  try {
    const snap = await getDocs(financeQ);
    snap.forEach((d) => {
      remoteFinanceDocs.set(d.id, d.data() as Record<string, unknown>);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, financeColPath);
  }

  const localFinance: Array<Record<string, unknown>> =
    typeof (window as unknown as { OneoraMoney?: { exportForSync?: () => Array<Record<string, unknown>> } }).OneoraMoney?.exportForSync === 'function'
      ? (window as unknown as { OneoraMoney: { exportForSync: () => Array<Record<string, unknown>> } }).OneoraMoney.exportForSync()
      : [];

  const localFinanceMap = new Map<string, Record<string, unknown>>();
  for (const rec of localFinance) {
    const id = safeId(String(rec.id || ''), 'fn');
    localFinanceMap.set(id, { ...rec, id });
  }

  const financeBatch = writeBatch(db);
  let financeBatchOps = 0;
  for (const [id, rec] of localFinanceMap.entries()) {
    const remote = remoteFinanceDocs.get(id);
    const localMs = clampNum(rec.updatedAtMs, 0, Date.now() + 86_400_000);
    const remoteMs = remote ? clampNum(remote.updatedAtMs, 0, Date.now() + 86_400_000) : 0;

    if (remote && remote.status === 'settled') continue; // Respect terminal state lock
    if (!remote || localMs > remoteMs) {
      const recordType = VALID_FINANCE_TYPES.has(String(rec.recordType)) ? String(rec.recordType) : 'expense';
      const paymentMethod = VALID_PAY_METHODS.has(String(rec.paymentMethod)) ? String(rec.paymentMethod) : 'upi';
      const status = VALID_FINANCE_STATUS.has(String(rec.status)) ? String(rec.status) : 'active';
      const payload: Record<string, unknown> = {
        ownerId: uid,
        recordType,
        title: clampStr(rec.title, 200) || 'Entry',
        amount: clampNum(rec.amount, 0, 1_000_000_000),
        targetAmount: clampNum(rec.targetAmount, 0, 1_000_000_000),
        category: clampStr(rec.category, 60) || 'Other',
        paymentMethod,
        dateKey: clampDateKey(rec.dateKey),
        notes: clampStr(rec.notes, 1000),
        counterparty: clampStr(rec.counterparty, 100),
        dueDay: clampNum(rec.dueDay, 0, 31),
        recurring: Boolean(rec.recurring),
        status,
        updatedAtMs: localMs || Date.now(),
        createdAt: remote?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      financeBatch.set(doc(db, 'users', uid, 'finance', id), payload);
      financeBatchOps += 1;
      pushedFinance += 1;
      if (financeBatchOps >= 400) break;
    }
  }

  if (financeBatchOps > 0) {
    try {
      await financeBatch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, financeColPath);
    }
  }

  const financeToMerge: Array<Record<string, unknown>> = [];
  for (const [id, remote] of remoteFinanceDocs.entries()) {
    const local = localFinanceMap.get(id);
    const localMs = local ? clampNum(local.updatedAtMs, 0, Date.now() + 86_400_000) : 0;
    const remoteMs = clampNum(remote.updatedAtMs, 0, Date.now() + 86_400_000);
    if (!local || remoteMs > localMs) {
      financeToMerge.push({ ...remote, id });
      pulledFinance += 1;
    }
  }
  if (
    financeToMerge.length > 0 &&
    typeof (window as unknown as { OneoraMoney?: { mergeFromSync?: (items: Array<Record<string, unknown>>) => void } }).OneoraMoney?.mergeFromSync === 'function'
  ) {
    (window as unknown as { OneoraMoney: { mergeFromSync: (items: Array<Record<string, unknown>>) => void } }).OneoraMoney.mergeFromSync(financeToMerge);
  }

  const syncedAt = new Date().toISOString();
  try {
    localStorage.setItem('oneoraLastCloudSync', syncedAt);
  } catch {
    // ignore storage errors
  }

  return { pushedPlanner, pulledPlanner, pushedFinance, pulledFinance, syncedAt };
}

async function deleteAccountData(): Promise<void> {
  if (!auth.currentUser) throw new Error('Please sign in first.');
  const uid = auth.currentUser.uid;

  for (const sub of ['planner', 'finance'] as const) {
    const subPath = `users/${uid}/${sub}`;
    try {
      const snap = await getDocs(query(collection(db, 'users', uid, sub), where('ownerId', '==', uid)));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, subPath);
    }
  }

  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

const OneoraCloud = {
  isReady: () => authReady,
  getUser: () => currentUser,
  onAuthChange: (cb: AuthListener) => {
    authListeners.add(cb);
    if (authReady) cb(currentUser);
    return () => authListeners.delete(cb);
  },
  signInWithGoogle: async () => {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserProfile(result.user);
    return result.user;
  },
  signOut: async () => {
    await firebaseSignOut(auth);
  },
  syncNow,
  deleteAccountData,
};

(window as unknown as { OneoraCloud: typeof OneoraCloud }).OneoraCloud = OneoraCloud;
export { OneoraCloud };
