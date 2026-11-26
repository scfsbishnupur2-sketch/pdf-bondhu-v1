# ONEORA Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Safety Net**: Every document path not explicitly matched is denied for all reads and writes.
2. **Strict Owner & Verified Identity**: Only authenticated users with `request.auth.token.email_verified == true` may access `/users/{userId}` and its subcollections where `userId == request.auth.uid`.
3. **Master Gate Relational Integrity**: Every `PlannerItem` (`/users/{userId}/planner/{itemId}`) and `FinanceRecord` (`/users/{userId}/finance/{recordId}`) must belong to an existing `/users/{userId}` parent document whose `ownerId == request.auth.uid` (verified via `existsAfter`/`get` on single-doc ops).
4. **PII Isolation**: User profile documents containing `email` and `displayName` are strictly restricted to the document owner (`isOwner(userId)`). Non-owners are denied `get` and `list`.
5. **Path Variable & Volumetric Hardening**: All document IDs (`userId`, `itemId`, `recordId`) must satisfy `^[a-zA-Z0-9_\-]+$` and `<= 128` chars on single-doc operations. Every string has an explicit `.size()` bound and every list has an explicit `.size() <= MAX` bound plus element type checks.
6. **Temporal Integrity & Immortality**: `createdAt == request.time` on create; `updatedAt == request.time` on create and update; `ownerId` and `createdAt` are immutable after creation.
7. **Terminal State Locking**: Once a `PlannerItem` has `status == 'archived'` or a `FinanceRecord` has `status == 'settled'`, no further updates are permitted (deletion remains allowed by the owner).
8. **Secure List Queries**: `allow list` never uses `get()`/`exists()` and always enforces `resource.data.ownerId == request.auth.uid`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-User PII Read**: User B calls `get('/users/userA')` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: User A with `email_verified: false` creates `/users/userA` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Create**: User A writes `/users/userA/planner/p1` with `{ ownerId: "userB", ... }` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection (Ghost Field)**: User A creates `/users/userA` with extra `{ isAdmin: true, plan: "pro" }` -> `PERMISSION_DENIED`.
5. **Path ID Poisoning**: User A writes `/users/userA/planner/bad..id$with%20spaces` or a 200-char ID -> `PERMISSION_DENIED`.
6. **Orphaned Subcollection Record**: User A creates `/users/userA/finance/f1` without a parent `/users/userA` profile -> `PERMISSION_DENIED`.
7. **Timestamp Forgery**: User A creates `/users/userA/finance/f1` with backdated client `createdAt` != `request.time` -> `PERMISSION_DENIED`.
8. **Immortal Field Mutation**: User A updates `/users/userA/planner/p1` attempting to alter `ownerId` or `createdAt` -> `PERMISSION_DENIED`.
9. **Terminal State Tampering**: User A updates a `PlannerItem` whose existing `status` is `'archived'` (or `FinanceRecord` with `'settled'`) -> `PERMISSION_DENIED`.
10. **Value Poisoning on Allowed Key**: User A updates `title` on a `PlannerItem` with a 10,000-character string or a boolean -> `PERMISSION_DENIED`.
11. **Array Exhaustion (Denial of Wallet)**: User A updates `quickActions` on `/users/userA` with 50 items or non-string first element -> `PERMISSION_DENIED`.
12. **Unauthorized Collection Scraping**: User B runs `list('/users/userA/finance')` -> `PERMISSION_DENIED`.
