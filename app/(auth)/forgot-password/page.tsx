// app/(auth)/forgot-password/page.tsx
import { Suspense } from "react";
import ForgotForm from "./ForgotForm";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh grid place-items-center p-6">Lädt…</div>}>
      <ForgotForm />
    </Suspense>
  );
}
