import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getOptionalUser = cache(async function getOptionalUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
});

export const requireUser = cache(async function requireUser() {
  const { supabase, user } = await getOptionalUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
});
