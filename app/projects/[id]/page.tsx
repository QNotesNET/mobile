import AppShell from "@/components/AppShell";
import ProjectDetailClient from "./Project-detail-client";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // Next 15: params aus dem Promise auspacken

  return (
    <AppShell>
      <ProjectDetailClient projectId={id} />
    </AppShell>
  );
}
