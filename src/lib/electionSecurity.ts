/**
 * NSBS ELECTION SYSTEM SECURITY & EXEMPTION CONTROL
 * 
 * Centralized registry and normalization rules for voter accreditation exemptions.
 */

// List of matriculation numbers belonging to Electoral Body members exempted from voting.
export const ELECTORAL_BODY_EXEMPT_MATRICS = [
  '2023/0445', // Olowoyo Abdullahi H.
  '2023/1075', // Olalekan Peter A.
  '2025/7936', // Oluwaniyi Hannah O.
  '2024/1589', // Fajemiyo Racheal T.
  '2023/1002', // Adeosun Praise A.
];

export const EXEMPTION_MESSAGE = "ELECTORAL BODY ARE EXEMPTED FROM VOTING";

/**
 * Normalizes a matriculation number by trimming whitespace, converting to uppercase,
 * and removing all internal spaces so minor formatting variations do not bypass security.
 */
export function normalizeMatric(rawMatric: string | null | undefined): string {
  if (!rawMatric) return '';
  return rawMatric.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Check if a given matriculation number belongs to an exempted electoral body member.
 */
export function isElectoralBodyExempt(rawMatric: string | null | undefined): boolean {
  const normalized = normalizeMatric(rawMatric);
  if (!normalized) return false;

  return ELECTORAL_BODY_EXEMPT_MATRICS.some(
    exemptMatric => normalizeMatric(exemptMatric) === normalized
  );
}
