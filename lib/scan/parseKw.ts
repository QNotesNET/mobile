// /lib/scan/parseKw.ts
export function parseKwText(ocrText: string) {
  // 1) Normalisieren: Zero-width, BOM, CRLF, lange Gedankenstriche
  let t = (ocrText || "")
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, "") // unsichtbare Zeichen
    .replace(/[–—]/g, "-")                       // en/em dash → '-'
    .replace(/\r\n?/g, "\n")
    .trim();

  // 2) Umrahmende ```-Codefences weg (manche Modelle packen alles in Codeblöcke)
  if (t.startsWith("```")) {
    // entferne die erste Fence-Zeile
    t = t.replace(/^```\w*\n?/, "");
  }
  if (t.endsWith("```")) {
    // entferne die letzte Fence-Zeile
    t = t.replace(/\n?```$/, "");
  }

  const lines = t.split("\n");

  const wa: string[] = [];
  const cal: string[] = [];
  const todo: string[] = [];
  const cleaned: string[] = [];

  // akzeptiert: "--kwTODO: …", "--kw TODO …", "-- kw: CAL …", usw.
  const kwRe = /^\s*`{0,3}?\s*--\s*kw\s*:?\s*(CAL|WA|TODO)\s*:?\s*(.*)$/i;

  for (const raw of lines) {
    const m = raw.match(kwRe);
    if (m) {
      const type = m[1].toUpperCase();
      const content = (m[2] || "").trim();

      if (type === "WA") wa.push(content);
      else if (type === "CAL") cal.push(content);
      else todo.push(content);

      // Im "cleanedText" wollen wir die Zeile ohne --kw Präfix behalten
      cleaned.push(content);
    } else {
      cleaned.push(raw);
    }
  }

  return {
    cleanedText: cleaned.join("\n").trim(),
    wa,
    cal,
    todo,
  };
}
