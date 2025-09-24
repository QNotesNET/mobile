// app/notebooks/[id]/page/[index]/page.tsx
export const runtime = "nodejs";

import { connectToDB } from "@/lib/mongoose";
import Page from "@/models/PageModel";

export default async function PageView({ params }: { params: { id: string; index: string } }) {
  await connectToDB();
  const page = await Page.findOne({ notebookId: params.id, pageIndex: Number(params.index) }).lean();

  if (!page) return <div>Seite nicht gefunden</div>;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Seite {page.pageIndex}</h1>
      <div className="grid gap-4 mt-4">
        {(page.images ?? []).map((img: any) => (
          <img key={img.url} src={img.url} alt={`Scan ${img.url}`} className="max-w-full rounded-lg" />
        ))}
      </div>
    </main>
  );
}
