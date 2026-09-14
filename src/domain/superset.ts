/**
 * The superset as a domain concept (spec §5.6).
 *
 * A superset is not an entity: it is two nullable columns — `superset_key` and
 * `superset_order` — on rows that stay distinct exercises. It lives in two
 * places, the program (`program_exercises`) and the logged workout
 * (`workout_exercises`), and the key means the same thing in both: that is why
 * it sits here and not inside the logging draft.
 */

/** Anything groupable: it only has to say which superset it belongs to. */
export interface SupersetMember {
  readonly supersetKey: string | null;
}

export function newSupersetKey(): string {
  return crypto.randomUUID();
}

/**
 * The contiguous run of rows forming the superset at `index`.
 *
 * Contiguous on purpose: in an ordered list — the slots of a program day — a
 * superset is a stretch, not a scattered set. That keeps "link to the previous
 * one" and "unlink" local operations, readable by looking at the row above,
 * without hunting the bottom of the list for whoever else shares the key. A row
 * without a key is a run of one.
 */
export function supersetRun<T extends SupersetMember>(
  members: readonly T[],
  index: number,
): readonly T[] {
  const member = members[index];
  if (!member) return [];
  if (member.supersetKey === null) return [member];

  let start = index;
  while (start > 0 && members[start - 1]?.supersetKey === member.supersetKey) start -= 1;

  let end = index;
  while (end < members.length - 1 && members[end + 1]?.supersetKey === member.supersetKey) end += 1;

  return members.slice(start, end + 1);
}

export interface SupersetGroup<T> {
  /** `null` for an exercise on its own. */
  readonly supersetKey: string | null;
  readonly members: readonly T[];
}

/**
 * Groups by superset while keeping the order: a group sits where its first
 * member sits, and whoever shares the key joins it there.
 *
 * Generic because the same grouping is needed on two different shapes: the
 * entries of a draft being logged, and the saved rows read back in the diary.
 * `keyOf` says where to find the key when it is not on the object itself.
 */
export function groupBySuperset<T>(
  members: readonly T[],
  keyOf: (member: T) => SupersetMember,
): SupersetGroup<T>[] {
  const groups: SupersetGroup<T>[] = [];
  const indexByKey = new Map<string, number>();

  for (const member of members) {
    const key = keyOf(member).supersetKey;
    if (key === null) {
      groups.push({ supersetKey: null, members: [member] });
      continue;
    }

    const existing = indexByKey.get(key);
    if (existing === undefined) {
      indexByKey.set(key, groups.length);
      groups.push({ supersetKey: key, members: [member] });
    } else {
      const group = groups[existing];
      if (group) groups[existing] = { ...group, members: [...group.members, member] };
    }
  }

  return groups;
}

export interface SupersetAssignment {
  readonly supersetKey: string | null;
  readonly supersetOrder: number | null;
}

/**
 * Puts the keys of a list back in order after a link, an unlink, a move or a
 * deletion.
 *
 * Two rules only, applied run by run:
 * - a superset of one is not a superset, so the key is dropped;
 * - a key that reappears further down, detached from its run, is a different
 *   superset and gets a fresh key. That happens when a slot is moved between a
 *   linked pair: without this rule the two would stay linked "at a distance",
 *   showing as a superset while logging but not in the program.
 *
 * Normalising everything after each change costs a few extra updates and
 * removes an entire class of inconsistent states.
 */
export function normalizeSupersets<T extends SupersetMember>(
  members: readonly T[],
): SupersetAssignment[] {
  const detached: SupersetAssignment = { supersetKey: null, supersetOrder: null };
  const assignments: SupersetAssignment[] = [];
  const seen = new Set<string>();

  let index = 0;
  while (index < members.length) {
    const key = members[index]?.supersetKey ?? null;
    if (key === null) {
      assignments.push(detached);
      index += 1;
      continue;
    }

    let end = index;
    while (end + 1 < members.length && members[end + 1]?.supersetKey === key) end += 1;
    const length = end - index + 1;

    const effective = length < 2 ? null : seen.has(key) ? newSupersetKey() : key;
    if (effective !== null) seen.add(effective);

    for (let offset = 0; offset < length; offset += 1) {
      assignments.push(
        effective === null ? detached : { supersetKey: effective, supersetOrder: offset },
      );
    }
    index = end + 1;
  }

  return assignments;
}
