// app/notebooks/[id]/page/[index]/page.tsx
export const runtime = "nodejs";

import Image from "next/image";
import { connectToDB } from "@/lib/mongoose";
import PageModel from "@/models/PageModel";

type Params = { id: string; index: string };
type PageImage = { url: string; width?: number; height?: number };

export default async function PageView(props: unknown) {
  // props sicher extrahieren, ohne any
  const p = (props as { params?: Partial<Params> } | undefined)?.params ?? {};
  const id = typeof p.id === "string" ? p.id : "";
  const indexNum = typeof p.index === "string" ? Number(p.index) : NaN;

  await connectToDB();

  const page = await PageModel.findOne({
    notebookId: id,
    pageIndex: indexNum,
  })
    .lean()
    .exec();

  if (!page) return <div className="p-6">Seite nicht gefunden</div>;

  const images: PageImage[] = Array.isArray(page.images)
    ? (page.images as unknown as PageImage[])
    : [];

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Seite {page.pageIndex}</h1>
      <div className="grid gap-4 mt-4">
        {images.map((img) => (
          <div key={img.url} className="relative w-full max-w-md aspect-[3/4]">
            <Image
              src={img.url}
              alt="Scan"
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-contain rounded-lg"
              priority
            />
          </div>
        ))}
      </div>
    </main>
  );
}
