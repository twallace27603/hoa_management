// Initial role set. New roles are added as *data* (see prisma/seed.ts), not
// as code changes here — but route guards still need to know which role
// names they care about, so keep this list in sync with what's seeded.
export const ROLES = {
  GLOBAL_ADMIN: 'GLOBAL_ADMIN',
  HOA_PRESIDENT: 'HOA_PRESIDENT',
  HOA_BOARD: 'HOA_BOARD',
  ARC_CHAIR: 'ARC_CHAIR',
  MEMBER: 'MEMBER',
  PUBLIC: 'PUBLIC',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
