const LETTERS: Record<string, string> = {
  a: "⠁",
  b: "⠃",
  c: "⠉",
  d: "⠙",
  e: "⠑",
  f: "⠋",
  g: "⠛",
  h: "⠓",
  i: "⠊",
  j: "⠚",
  k: "⠅",
  l: "⠇",
  m: "⠍",
  n: "⠝",
  o: "⠕",
  p: "⠏",
  q: "⠟",
  r: "⠗",
  s: "⠎",
  t: "⠞",
  u: "⠥",
  v: "⠧",
  w: "⠺",
  x: "⠭",
  y: "⠽",
  z: "⠵",
};

const PUNCTUATION: Record<string, string> = {
  ",": "⠂",
  ";": "⠆",
  ":": "⠒",
  ".": "⠲",
  "?": "⠦",
  "!": "⠖",
  "-": "⠤",
  "—": "⠒⠒",
  "–": "⠒",
  "'": "⠄",
  "\"": "⠶",
  "/": "⠌",
  "(": "⠷",
  ")": "⠾",
};

const NUMBER_SIGN = "⠼";
const CAPITAL_SIGN = "⠠";

const DIGITS: Record<string, string> = {
  "1": "a",
  "2": "b",
  "3": "c",
  "4": "d",
  "5": "e",
  "6": "f",
  "7": "g",
  "8": "h",
  "9": "i",
  "0": "j",
};

/**
 * Lightweight Grade 1 Braille mapper for prototypes.
 * Converts ASCII text into Unicode Braille cells and retains whitespace.
 */
export function textToBraille(text: string): string {
  let result = "";
  let numberMode = false;

  for (const char of text) {
    if (char >= "0" && char <= "9") {
      if (!numberMode) {
        result += NUMBER_SIGN;
        numberMode = true;
      }
      const mappedDigit = DIGITS[char];
      result += mappedDigit ? LETTERS[mappedDigit] : char;
      continue;
    }

    // Reset number mode when leaving digits.
    if (numberMode && char !== " ") {
      numberMode = false;
    }

    if (char >= "A" && char <= "Z") {
      const braille = LETTERS[char.toLowerCase()];
      result += braille ? CAPITAL_SIGN + braille : char;
      continue;
    }

    if (char >= "a" && char <= "z") {
      result += LETTERS[char] ?? char;
      continue;
    }

    if (char === " " || char === "\n" || char === "\r" || char === "\t") {
      result += char;
      continue;
    }

    const punct = PUNCTUATION[char];
    result += punct ?? char;
  }

  return result;
}

/**
 * Prepares a minimal .brf-friendly string for download.
 * This keeps carriage returns to make import into Braille editors predictable.
 */
export function toBrfContent(text: string): string {
  const braille = textToBraille(text);
  return braille.replace(/\n/g, "\r\n");
}
