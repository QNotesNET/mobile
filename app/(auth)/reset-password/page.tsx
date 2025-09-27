import { Suspense } from "react";
import ResetForm from "./ResetForm";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh grid place-items-center p-6">Lädt…</div>}>
      <ResetForm />
    </Suspense>
  );
}
