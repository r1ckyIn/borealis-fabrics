/**
 * Check if a WeWork user ID belongs to an admin (boss or developer).
 * Reads from BOSS_WEWORK_IDS and DEV_WEWORK_IDS environment variables.
 */
export function isAdminWeworkId(weworkId: string): boolean {
  const bossIds = (process.env.BOSS_WEWORK_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const devIds = (process.env.DEV_WEWORK_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return bossIds.includes(weworkId) || devIds.includes(weworkId);
}
