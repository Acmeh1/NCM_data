function randomHex(bytes: number) {
  const arr = new Uint8Array(bytes);
  // Prefer crypto.getRandomValues when available (works even when randomUUID is missing)
  const cryptoObj = (globalThis as any).crypto;
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(arr);
  else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function uuidv4(): string {
  const cryptoObj = (globalThis as any).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();

  // RFC 4122 v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex = randomHex(16).split("");
  hex[12] = "4";
  // y = 8, 9, a, b
  const y = parseInt(hex[16], 16);
  hex[16] = ((y & 0x3) | 0x8).toString(16);
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

