import { AuthForm } from "@/components/auth-form";
import { getOAuthErrorMessage } from "@/lib/auth/oauth-error";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return <AuthForm mode="login" googleEnabled={googleEnabled} initialError={getOAuthErrorMessage(error)} />;
}
