import { connectToDB } from "@/lib/mongoose";
import Page from "@/models/PageModel";
import UploadForm from "@/components/UploadForm";

export default async function ScanPage({ params }: { params: { token: string } }) {
  await connectToDB();

  const page = await Page.findOne({ pageToken: params.token })
    .select({ _id: 1, notebookId: 1, pageIndex: 1, images: 1 })
    .lean<{ _id: any; notebookId: any; pageIndex: number; images?: { url: string; createdAt?: string }[] } | null>();

  if (!page) {
    return <main className="p-8">Ungültiger oder abgelaufener Code.</main>;
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold">Seite {page.pageIndex}</h1>
      <p className="text-gray-600 mb-4">Notebook: {String(page.notebookId)}</p>

      {/* Client-Formular */}
      <UploadForm pageId={String(page._id)} />

      <div className="mt-6 grid gap-3">
        {(page.images ?? []).map((img) => (
          <img key={img.url} src={img.url} alt="Scan" className="rounded border" />
        ))}
      </div>
    </main>
  );
}
