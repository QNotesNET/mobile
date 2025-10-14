export function parseKwText(ocrText: string): {
  cleanedText: string;
  wa: string[];
  cal: string[];
  todo: string[];
} {
  const lines = (ocrText || "").split(/\r?\n/);
  const cleaned: string[] = [];
  const wa: string[] = [];
  const cal: string[] = [];
  const todo: string[] = [];

  const re = /^\s*--kw\s+(CAL|WA|TODO)\s*:?\s*(.*)$/i;

  for (const raw of lines) {
    const m = raw.match(re);
    if (m) {
      const type = m[1].toUpperCase();
      const content = (m[2] || "").trim();
      if (type === "WA") wa.push(content);
      else if (type === "CAL") cal.push(content);
      else if (type === "TODO") todo.push(content);
      cleaned.push(content); // ohne --kw
    } else {
      cleaned.push(raw);
    }
  }
  return { cleanedText: cleaned.join("\n").trim(), wa, cal, todo };
}
