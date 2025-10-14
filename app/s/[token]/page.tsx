// app/s/[token]/page.tsx
import { connectToDB } from "@/lib/mongoose";
import Page from "@/models/PageModel";
import UploadForm from "@/components/UploadForm";
import { Types } from "mongoose";
import Image from "next/image";

type LeanScanPage = {
  _id: Types.ObjectId;
  notebookId: Types.ObjectId;
  pageIndex: number;
  images?: { url: string; createdAt?: Date }[];
};

export default async function ScanPage(
  props: { params: Promise<{ token: string }> }
) {
  const { token } = await props.params;
  await connectToDB();

  const page = await Page.findOne({ pageToken: token })
    .select({ _id: 1, notebookId: 1, pageIndex: 1, images: 1 })
    .lean<LeanScanPage | null>();

  if (!page) {
    return <main className="p-8">Ungültiger oder abgelaufener Code.</main>;
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold">Seite {page.pageIndex}</h1>
      <p className="text-gray-600 mb-4">Notebook: {String(page.notebookId)}</p>

      {/* Client-Formular */}
      <UploadForm pageId={String(page._id)} notebookId={String(page.notebookId)} />

      {/* <div className="mt-6 grid gap-3">
        {(page.images ?? []).map((img) => (
          <div key={img.url} className="overflow-hidden rounded border">
            <Image
              src={img.url}
              alt="Scan"
              width={1000}
              height={1400}
              className="h-auto w-full"
              // Wenn deine Bild-URLs extern sind und (noch) nicht in next.config.js whitelisted:
              unoptimized
            />
          </div>
        ))}
      </div> */}
    </main>
  );
}
