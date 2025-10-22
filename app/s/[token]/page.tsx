// app/s/[token]/page.tsx
import { connectToDB } from "@/lib/mongoose";
import Page from "@/models/PageModel";
import UploadForm from "@/components/UploadForm";
import { Types } from "mongoose";
import Image from "next/image";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
    <AppShell>
    <main className="p-6 mx-auto">
      <Link href={`/notebooks/${page.notebookId}`} className="text-gray-600 text-sm mb-4 inline-block hover:underline">
      <ArrowLeft className="inline-block mr-1 h-4 w-4" />
      Zurück zur Übersicht
      </Link>
      <h1 className="text-xl font-semibold mb-4">Seite {page.pageIndex}</h1>
      {/* <p className="text-gray-600 mb-4">Notebook: {String(page.notebookId)}</p> */}

      {/* Client-Formular */}
      <UploadForm pageId={String(page._id)} notebookId={String(page.notebookId)} pageToken={token}/>
    </main>
    </AppShell>
  );
}
