// components/pages/PageExportButtons.tsx
"use client";
export default function PageExportButtons({ pageId }: { pageId: string }) {
  return (
    <div className="flex gap-2">
      <a
        href={`/api/pages/${pageId}/export?format=pdf`}
        className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        PDF
      </a>
      <a
        href={`/api/pages/${pageId}/export?format=png`}
        className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        PNG
      </a>
    </div>
  );
}
