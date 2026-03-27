import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const getApiAuth = cache(async function getApiAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
});

export async function requireApiUser() {
  return getApiAuth();
}
