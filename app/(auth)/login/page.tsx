import { AuthForm } from "@/components/auth-form";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <AuthForm
      mode="login"
      googleEnabled={googleEnabled}
      googleWebClientId={process.env.GOOGLE_CLIENT_ID}
      initialErrorCode={error}
    />
  );
}
