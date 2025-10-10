import Link from "next/link";
import mongoose from "mongoose";
import connectToDB from "@/lib/mongoose";
import { ObjectId, Filter } from "mongodb";
import CopyToClipboard from "@/components/CopyToClipboard"; // ⬅️ neu

type PageDoc = {
  _id: ObjectId;
  notebookId: ObjectId;
  pageIndex: number;
  pageToken: string;
};

function buildAbsolute(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  try {
    return base ? new URL(path, base).toString() : path;
  } catch {
    return path;
  }
}

export default async function QRPage({
  params,
}: {
  params: Promise<{ id: string; index: string }>;
}) {
  const { id, index } = await params;

  await connectToDB();
  const db = mongoose.connection.db!;
  const pageDoc = await db
    .collection<PageDoc>("pages")
    .findOne(
      { notebookId: new ObjectId(id), pageIndex: Number(index) } as Filter<PageDoc>,
      { projection: { pageIndex: 1, pageToken: 1 } }
    );

  if (!pageDoc) {
    return (
      <div className="max-w-3xl">
        <Link href={`/notebooks/${id}`} className="text-sm text-gray-600 hover:underline">
          ← Zurück
        </Link>
        <h1 className="mt-3 text-xl font-semibold">QR nicht gefunden</h1>
        <p className="mt-2 text-gray-600">Für diese Seite existiert kein Token.</p>
      </div>
    );
  }

  const scanPath = `/s/${encodeURIComponent(pageDoc.pageToken)}`;
  const scanUrl = buildAbsolute(scanPath);
  const qrPngUrl = `/api/qr/page/${encodeURIComponent(pageDoc.pageToken)}`;

  return (
    <div className="max-w-5xl">
      <Link href={`/notebooks/${id}`} className="text-sm text-gray-600 hover:underline">
        ← Zurück zur Übersicht
      </Link>

      <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start">
        {/* QR Preview */}
        <div className="rounded-2xl border bg-white p-4">
          <img
            src={qrPngUrl}
            alt={`QR-Code für Seite ${pageDoc.pageIndex}`}
            className="h-64 w-64 rounded-lg border object-contain"
          />
          <div className="mt-3 flex gap-2">
            <a
              href={qrPngUrl}
              download={`qnotes-qr-seite-${pageDoc.pageIndex}.png`}
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Als PNG herunterladen
            </a>
            <a
              href={scanPath}
              target="_blank"
              className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Ziel öffnen
            </a>
          </div>
        </div>

        {/* Link & Info */}
        <div className="grow rounded-2xl border bg-white p-4">
          <h1 className="text-xl font-semibold">QR-Code – Seite {pageDoc.pageIndex}</h1>
          <p className="mt-1 text-sm text-gray-600">Dieser QR verlinkt auf die Scan-URL der Seite.</p>

          <div className="mt-4">
            <div className="text-xs font-medium text-gray-500">Scan-Link</div>
            <div className="mt-1 flex items-center gap-2">
              <code className="block max-w-full truncate rounded-md bg-gray-100 px-2 py-1 text-sm text-gray-800">
                {scanUrl}
              </code>

              {/* ⬇️ Client Component statt onClick im Server Component */}
              <CopyToClipboard text={scanUrl} />
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-600">
            Tipp: Drucke den PNG-QR auf die physische Seite oder klebe ihn ein. Beim Scannen
            landet man direkt auf der passenden Seite in QNotes.
          </div>
        </div>
      </div>
    </div>
  );
}
