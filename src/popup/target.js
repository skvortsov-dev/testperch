export const MAX_TARGETS = 20;

/** Preserve literal IDs: no lowercasing, substring matching, or alias expansion. */
export function parseTargets(value) {
  if (typeof value !== "string")
    throw Error("Enter at least one email or user/device ID.");
  const targets = [
    ...new Set(
      value
        .split(/[\n,;]+/u)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  if (!targets.length)
    throw Error("Enter at least one email or user/device ID.");
  if (targets.length > MAX_TARGETS)
    throw Error(`Use up to ${MAX_TARGETS} IDs at a time.`);
  if (
    targets.some(
      (id) => id.length > 1024 || /[\s\u0000-\u001f\u007f]/u.test(id),
    )
  )
    throw Error("Each ID must be at most 1024 characters, without spaces.");
  return targets;
}

export function isCustomTarget(targets, user) {
  return targets.length !== 1 || targets[0] !== user;
}

export function restoredTargets(saved, account) {
  if (
    saved?.user !== account.user ||
    saved?.orgId !== account.orgId ||
    !Array.isArray(saved.targets)
  )
    return [account.user];
  try {
    if (
      saved.targets.some((id) => typeof id !== "string" || /[\n,;]/u.test(id))
    )
      return [account.user];
    return saved.targets.length ? parseTargets(saved.targets.join("\n")) : [];
  } catch {
    return [account.user];
  }
}
