import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getOptionalUser } from "@/lib/auth";
import { SUPABASE_CONFIG_ERROR, hasSupabasePublicEnv } from "@/lib/supabase/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const isConfigured = hasSupabasePublicEnv();

  if (isConfigured) {
    const { user } = await getOptionalUser();

    if (user) {
      redirect(next || "/extract");
    }
  }

  return (
    <LoginForm
      next={next || "/extract"}
      supabaseConfigured={isConfigured}
      configurationMessage={SUPABASE_CONFIG_ERROR}
    />
  );
}
