const KINGUIN_REGION_MAP: Record<string, string> = {
  'global': 'Global',
  'region-free': 'Global',
  'region free': 'Global',
  'worldwide': 'Worldwide',
  '1': 'Region 1 (US / Canada)',
  'region 1': 'Region 1 (US / Canada)',
  '2': 'Region 2 (Europe / Japan / Middle East)',
  'region 2': 'Region 2 (Europe / Japan / Middle East)',
  '3': 'Region 3 (Southeast Asia)',
  'region 3': 'Region 3 (Southeast Asia)',
  '4': 'Region 4 (Australia / New Zealand)',
  'region 4': 'Region 4 (Australia / New Zealand)',
  '5': 'Region 5 (South America / Africa / Russia)',
  'region 5': 'Region 5 (South America / Africa / Russia)',
}

export function normalizeKinguinRegion(regionInput: unknown): string {
  if (regionInput === null || regionInput === undefined) {
    return 'GLOBAL'
  }

  const regionString = String(regionInput).trim()
  if (!regionString) {
    return 'GLOBAL'
  }

  const normalized = regionString.toLowerCase()
  return KINGUIN_REGION_MAP[normalized] || regionString
}

