/**
 * Utility for computing field-level changes between entity states.
 * Used by AuditInterceptor to record what changed in CUD operations.
 */

/** Represents a single field change with old and new values */
export interface FieldDiff {
  old: unknown;
  new: unknown;
}

/** Fields excluded from change diffs (system-managed) */
const EXCLUDED_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt']);

/**
 * Build a changes diff between before and after entity states.
 *
 * - create: returns all non-null fields from after (flat key-value)
 * - update: returns only changed fields as { field: { old, new } }
 * - delete: returns all non-null fields from before (flat key-value)
 * - restore: returns { deletedAt: { old: <timestamp>, new: null } }
 */
export function buildChangesDiff(
  action: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Record<string, FieldDiff> | Record<string, unknown> {
  if (action === 'create' && after) {
    return extractNonNullFields(after);
  }

  if (action === 'delete' && before) {
    return extractNonNullFields(before);
  }

  if (action === 'restore' && before) {
    return {
      deletedAt: { old: before.deletedAt, new: null } as FieldDiff,
    };
  }

  if (action === 'update' && before && after) {
    return computeUpdateDiff(before, after);
  }

  return {};
}

/**
 * Extract non-null, non-excluded fields from an entity state.
 */
function extractNonNullFields(
  state: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (!EXCLUDED_FIELDS.has(key) && value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Compute field-level diff for update operations.
 * Uses JSON.stringify for deep equality comparison.
 */
function computeUpdateDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, FieldDiff> {
  const diff: Record<string, FieldDiff> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (EXCLUDED_FIELDS.has(key)) continue;

    const oldVal = before[key];
    const newVal = after[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }

  return diff;
}
