/**
 * Tiered discount helper shared with the public checkout flow.
 * Starts at 10 units (2.39% off) and caps at 45% from 100 units.
 */
export const DISCOUNT_RULE = {
  startQty: 10,
  endQty: 100,
  stepQty: 5,
  stepPct: 0.0239,
  maxPct: 0.4545,
};

export function getDiscountPct(qty, rule = DISCOUNT_RULE) {
  const n = Math.max(1, Number(qty || 1));
  if (n < rule.startQty) return 0;
  const steps = Math.floor((n - rule.startQty) / rule.stepQty) + 1;
  const pct = Math.min(rule.maxPct, steps * rule.stepPct);
  return Number(pct.toFixed(4));
}

export function priceForItem({ slug, qty = 1, price }, products = []) {
  const product = products.find((p) => p.slug === slug) || null;
  const baseUnit = Number(price ?? product?.price ?? 0);
  const n = Math.max(1, Number(qty || 1));
  const discountPct = getDiscountPct(n);
  const unitAfter = baseUnit * (1 - discountPct);
  const lineTotal = unitAfter * n;
  return {
    slug,
    qty: n,
    baseUnit,
    discountPct,
    unitAfter: Math.round(unitAfter * 100) / 100,
    lineTotal: Math.round(lineTotal * 100) / 100,
  };
}

export function priceCart(items = [], products = []) {
  const rows = items.map((it) => priceForItem(it, products));
  const merchandiseTotal = rows.reduce((sum, row) => sum + row.lineTotal, 0);
  return {
    rows,
    merchandiseTotal: Math.round(merchandiseTotal * 100) / 100,
  };
}
