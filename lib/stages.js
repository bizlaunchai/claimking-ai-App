// QA Q4.2 — shared effective-stage source for the claims module.
//
// The backend `/client-portal/stage-overrides` returns `effective`: the resolved
// per-company stage list (built-ins + custom, in display order, renamed, with a
// behavior category). This module fetches it once, caches it, and exposes the
// list + a label resolver so every claim status picker (ClaimsPage board,
// ClaimDetail dropdown, create form) shows the SAME stages incl. custom ones.
//
// Falls back to the canonical 12 built-ins if the fetch fails or hasn't run yet,
// so server render + first client render stay stable.
import axiosInstance from '@/lib/axiosInstance';

const BUILTIN_NAMES = [
  'Need Claim Number', 'Awaiting Initial Inspection', 'Scheduled Inspection',
  'In Progress', 'ITEL Sample Required', 'Reinspection Requested',
  'Partial Approval', 'Supplementing', 'Final Check Processing',
  'Completed', 'Declined', 'Cold Claims / Lost',
];

const BUILTIN_CATEGORY = {
  1: 'active', 2: 'active', 3: 'active', 4: 'active', 5: 'active', 6: 'active',
  7: 'approved', 8: 'approved', 9: 'approved',
  10: 'closed_won', 11: 'closed_lost', 12: 'closed_lost',
};

const builtinList = () =>
  BUILTIN_NAMES.map((label, i) => ({
    num: i + 1, label, category: BUILTIN_CATEGORY[i + 1], custom: false, hidden: false,
  }));

let cache = null;      // effective array
let hiddenSet = new Set();

const strip = (s) => String(s ?? '').replace(/^\d+\.\s*/, '');

/** Fetch + cache the effective stage list. Safe to call repeatedly. */
export async function fetchStages() {
  try {
    const res = await axiosInstance.get('/client-portal/stage-overrides', { suppressErrorToast: true });
    const eff = res.data?.data?.effective;
    const hidden = res.data?.data?.hidden;
    if (Array.isArray(eff) && eff.length) {
      cache = eff.map((s) => ({ ...s, label: strip(s.label) }));
      hiddenSet = new Set(Array.isArray(hidden) ? hidden : []);
      return cache;
    }
  } catch { /* fall through to built-ins */ }
  cache = builtinList();
  return cache;
}

/** The full ordered stage list (incl. custom). Never empty. */
export function allStages() {
  return cache || builtinList();
}

/** Stages to offer in a picker — excludes hidden ones (but keeps the current). */
export function pickableStages(currentNum) {
  return allStages().filter((s) => !hiddenSet.has(s.num) || s.num === currentNum);
}

/** Plain label for a stage number (custom-aware), prefix stripped. */
export function stageLabel(num) {
  const s = allStages().find((x) => x.num === num);
  if (s) return s.label;
  return BUILTIN_NAMES[num - 1] || `Stage ${num}`;
}

export function stageCategory(num) {
  const s = allStages().find((x) => x.num === num);
  return s?.category ?? BUILTIN_CATEGORY[num] ?? 'active';
}

export function isClosedStage(num) {
  const c = stageCategory(num);
  return c === 'closed_won' || c === 'closed_lost';
}
