import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth";
import { hasSupabasePublicEnv } from "@/lib/supabase/config";

export default async function HomePage() {
  if (!hasSupabasePublicEnv()) {
    redirect("/login");
  }

  const { user } = await getOptionalUser();
  redirect(user ? "/extract" : "/login");
}
