// app/(auth)/register/page.tsx
import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh grid place-items-center p-6">Lädt…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
