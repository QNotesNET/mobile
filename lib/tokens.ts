// lib/tokens.ts
export function genPageToken(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXZ23456789";
  let out = "QN-";
  for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random()*alphabet.length)];
  return out;
}
