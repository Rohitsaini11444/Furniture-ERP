/**
 * Strict Quantity Formatter according to Unit Rules:
 * - Pcs / Nos / Items / Pieces: Integer only (0 decimal places) -> 10 pcs
 * - Ft / Ft² / Mtr / Set: 2 decimal places (.00) -> 9.00 ft²
 * - Kg / Kgs: 3 decimal places (.000) -> 12.500 kgs
 */
export function fmtQty(qty, unit = 'pcs') {
  if (qty === null || qty === undefined || isNaN(qty)) return '0';
  const val = parseFloat(qty);
  const u = (unit || '').toLowerCase().trim();

  if (['pcs', 'pieces', 'nos', 'no', 'no.', 'item', 'items'].includes(u)) {
    return Math.round(val).toLocaleString('en-IN');
  }

  if (['kg', 'kgs'].includes(u)) {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }

  // Default: 2 decimals for ft, ft², mtr, set, etc.
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtQtyWithUnit(qty, unit = 'pcs') {
  return `${fmtQty(qty, unit)} ${unit}`;
}
