import { Suspense } from "react";import { ResetPasswordForm } from "@/components/reset-password-form";
export default function Page(){return <main className="shell"><Suspense fallback={<p>Chargement…</p>}><ResetPasswordForm/></Suspense></main>}
