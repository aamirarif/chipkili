/** US numbers only. Returns E.164 (+1XXXXXXXXXX) or null. */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(ten)) return null;
  return `+1${ten}`;
}

export function prettyPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-10);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function maskPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-10);
  return `(${d.slice(0, 3)}) •••-${d.slice(6)}`;
}
