export interface Spread {
  left: number | null
  right: number | null
}

/**
 * Page 1 is treated as a cover shown alone on the right.
 * After that, pages pair up as (2,3), (4,5), ...
 */
export function getSpread(page: number, spread: boolean, numPages: number): Spread {
  if (numPages <= 0) return { left: null, right: null }
  const clamped = Math.min(Math.max(1, page), numPages)
  if (!spread) return { left: null, right: clamped }
  if (clamped <= 1) return { left: null, right: 1 }
  const left = clamped % 2 === 0 ? clamped : clamped - 1
  const right = left + 1 <= numPages ? left + 1 : null
  return { left, right }
}

export function nextPage(page: number, spread: boolean, numPages: number): number {
  if (numPages <= 0) return page
  if (!spread) return Math.min(page + 1, numPages)
  if (page <= 1) return Math.min(2, numPages)
  const left = page % 2 === 0 ? page : page - 1
  return Math.min(left + 2, numPages)
}

export function prevPage(page: number, spread: boolean, _numPages: number): number {
  if (!spread) return Math.max(page - 1, 1)
  if (page <= 2) return 1
  const left = page % 2 === 0 ? page : page - 1
  return Math.max(left - 2, 1)
}
