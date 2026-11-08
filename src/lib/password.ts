const WORDS = [
  "kiwi",
  "moon",
  "river",
  "tiger",
  "mango",
  "cloud",
  "lotus",
  "stone",
  "eagle",
  "rain",
  "sun",
  "tree",
  "lake",
  "star",
  "rice",
  "wind",
]

/** A readable password to tell someone by phone, e.g. "kiwi-4821-moon" */
export function readablePassword(random: (n: number) => number = cryptoInt) {
  const word = () => WORDS[random(WORDS.length)]
  const digits = String(random(9000) + 1000)
  return `${word()}-${digits}-${word()}`
}

function cryptoInt(n: number): number {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0] % n
}
