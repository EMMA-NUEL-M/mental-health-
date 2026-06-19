import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, is_suspended")
    .eq("id", data.user.id)
    .single();

  if (profile?.is_suspended) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login`);
  }

  return NextResponse.redirect(`${origin}${profile?.onboarded ? "/lobby" : "/onboarding"}`);
}