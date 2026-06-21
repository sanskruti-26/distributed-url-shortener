// Base62 encoding: turns the auto-incrementing DB id into a short, URL-safe code.
// Why this instead of a random string or UUID:
// - Random strings need a uniqueness check + retry loop (slower, can theoretically collide)
// - UUIDs are 36 chars — way too long for a "short" link
// - Base62 of an auto-increment id is short, collision-free by construction (the DB
//   guarantees the id is unique), and reversible if you ever need to debug.

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = ALPHABET.length; // 62

export function encodeBase62(num: number): string {
  if (num === 0) return ALPHABET[0];
  let code = "";
  while (num > 0) {
    code = ALPHABET[num % BASE] + code;
    num = Math.floor(num / BASE);
  }
  return code;
}

export function decodeBase62(code: string): number {
  let num = 0;
  for (const char of code) {
    num = num * BASE + ALPHABET.indexOf(char);
  }
  return num;
}
