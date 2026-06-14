/** Returns true when the given email belongs to an admin. */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env["ADMIN_EMAILS"] ?? "tokans.org@gmail.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
