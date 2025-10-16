import AppShell from "@/components/AppShell";
import ProjectDetailClient from "./Project-detail-client";

export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <ProjectDetailClient projectId={params.id} />
    </AppShell>
  );
}
