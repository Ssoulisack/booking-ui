// The same lists as the backend (domain/directory.go): what customers filter places by.
// Names come from i18n: sportTypes.<type>, provinces.<province>.

export const SPORT_TYPES = [
  "football",
  "futsal",
  "badminton",
  "tennis",
  "table_tennis",
  "basketball",
  "volleyball",
  "boxing",
  "muay_thai",
  "swimming",
  "golf",
  "fitness",
  "petanque",
  "other",
] as const
export type SportType = (typeof SPORT_TYPES)[number]

export const PROVINCES = [
  "vientiane_capital",
  "phongsaly",
  "luang_namtha",
  "oudomxay",
  "bokeo",
  "luang_prabang",
  "houaphanh",
  "xayabury",
  "xiengkhouang",
  "vientiane",
  "bolikhamxay",
  "khammouane",
  "savannakhet",
  "saravane",
  "sekong",
  "champasack",
  "attapeu",
  "xaisomboun",
] as const
export type Province = (typeof PROVINCES)[number]

/** The distinct sport types of a place, in list order, without "other" */
export function placeTypes(sports: Array<{ type: SportType }>): SportType[] {
  const have = new Set(sports.map((s) => s.type))
  return SPORT_TYPES.filter((t) => t !== "other" && have.has(t))
}
