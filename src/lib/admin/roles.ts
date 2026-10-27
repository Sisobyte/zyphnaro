// Admin roles and what each one may do. Pure data + functions (no I/O), so it
// can be unit-tested and imported from both server and client code.

export type AdminRole = "owner" | "support" | "viewer";

export const ROLES: AdminRole[] = ["owner", "support", "viewer"];

const RANK: Record<AdminRole, number> = { viewer: 1, support: 2, owner: 3 };

export const ROLE_LABEL: Record<AdminRole, string> = {
  owner: "Owner",
  support: "Support",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTION: Record<AdminRole, string> = {
  owner: "Full control: team, switches, sources, deleting accounts, audit log.",
  support: "Helps users: disable/enable, sign out, resend confirmation, send announcements.",
  viewer: "Read-only: can see numbers, users and sync health, can change nothing.",
};

export type Permission =
  | "view" // overview, users list, sync health, announcements history
  | "user.manage" // disable/enable, force sign-out, resend confirmation
  | "announce" // send announcements
  | "user.delete"
  | "controls" // switches (maintenance, signups, AI, sync pause, banner)
  | "sources" // pause sources, run a sync
  | "team" // manage admin team
  | "audit"; // read the audit log

const MIN_ROLE: Record<Permission, AdminRole> = {
  view: "viewer",
  "user.manage": "support",
  announce: "support",
  "user.delete": "owner",
  controls: "owner",
  sources: "owner",
  team: "owner",
  audit: "owner",
};

export function isAdminRole(v: unknown): v is AdminRole {
  return v === "owner" || v === "support" || v === "viewer";
}

export function can(role: AdminRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[MIN_ROLE[permission]];
}

/** Everything a role may do, for the client to show/hide buttons. */
export function permissionsFor(role: AdminRole | null | undefined): Permission[] {
  return (Object.keys(MIN_ROLE) as Permission[]).filter((p) => can(role, p));
}

/**
 * Whether `actor` may act on a user who holds `targetRole` (null = ordinary user)
 * with a destructive/user-affecting action. Rules:
 *  - nobody acts on themselves (no locking yourself out, no self-delete here)
 *  - nobody acts on an owner (owners are changed by editing the database)
 *  - otherwise the actor needs the permission
 */
export function canActOnUser(opts: {
  actorRole: AdminRole;
  actorId: string;
  targetId: string;
  targetRole: AdminRole | null;
  permission: Permission;
}): { ok: true } | { ok: false; reason: string } {
  if (!can(opts.actorRole, opts.permission)) return { ok: false, reason: "Your role can't do that." };
  if (opts.actorId === opts.targetId) return { ok: false, reason: "You can't do that to your own account." };
  if (opts.targetRole === "owner") return { ok: false, reason: "Owners can't be changed from here." };
  return { ok: true };
}

/** Owners may add/change/remove non-owner admins only. */
export function canManageTeamMember(opts: {
  actorRole: AdminRole;
  actorId: string;
  targetId: string;
  targetRole: AdminRole | null;
  newRole?: AdminRole;
}): { ok: true } | { ok: false; reason: string } {
  if (!can(opts.actorRole, "team")) return { ok: false, reason: "Only owners manage the team." };
  if (opts.actorId === opts.targetId) return { ok: false, reason: "You can't change your own role." };
  if (opts.targetRole === "owner") return { ok: false, reason: "Owners can't be changed from here." };
  if (opts.newRole === "owner") return { ok: false, reason: "Owners are created in the database, not here." };
  return { ok: true };
}
