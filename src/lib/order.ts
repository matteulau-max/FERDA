/**
 * A copy of `items` with the entry at `index` moved `delta` places.
 *
 * Moves that would fall off either end return the original array untouched,
 * so a caller can hand it a click on a disabled-looking button without
 * having to check the bounds first.
 */
export function moveItem<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta
  if (index < 0 || index >= items.length) return items
  if (target < 0 || target >= items.length) return items

  const next = [...items]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}
