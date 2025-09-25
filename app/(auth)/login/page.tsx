import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh grid place-items-center p-6">Lädt…</div>}>
      <LoginForm />
    </Suspense>
  );
}
