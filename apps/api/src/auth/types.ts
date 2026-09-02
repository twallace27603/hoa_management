// Shape attached to `request.user` after JwtStrategy validation.
// This is intentionally *not* the raw JWT payload: it's the app's own
// view of "who is this and what can they do", resolved from our DB
// (Membership rows), because authorization is owned by the app, not
// the IdP. See docs/auth.md.
export interface AuthenticatedUser {
  /** Entra External ID object id (the JWT `oid` claim). */
  entraObjectId: string;
  email: string;
  /** Null until the user has completed at least one accepted invite. */
  userId: string | null;
  memberships: Array<{
    hoaId: string | null; // null for global roles (e.g. GLOBAL_ADMIN)
    role: string;
  }>;
}
