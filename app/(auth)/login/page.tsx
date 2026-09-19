import { AuthForm } from "@/components/auth-form";

export default function Page() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return <AuthForm mode="login" googleEnabled={googleEnabled} showDemoLink />;
}
