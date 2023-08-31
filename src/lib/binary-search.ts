// taken from https://github.com/dsherret/ts-morph/blob/382f0c8a9d53326bc295111d722973bbd428d805/packages/common/src/utils/ArrayUtils.ts#L84

/**
 * Compares a value against a stored value.
 */
export interface StoredComparer<T> {
  /**
   * Checks the value against a stored value returning -1 if the stored value preceeds, 0 if the value is equal, and 1 if follows.
   * @param value - Value to compare.
   */
  (value: T): number
}

/**
 * Checks the value against a stored value returning -1 if the stored value preceeds, 0 if the value is equal, and 1 if follows.
 */
export function binarySearch<T>(items: ReadonlyArray<T>, storedComparer: StoredComparer<T>) {
  let top = items.length - 1
  let bottom = 0

  while (bottom <= top) {
    const mid = Math.floor((top + bottom) / 2)
    const comparisonResult = storedComparer(items[mid])
    if (comparisonResult === 0) return mid
    else if (comparisonResult < 0) top = mid - 1
    else bottom = mid + 1
  }

  return -1
}
