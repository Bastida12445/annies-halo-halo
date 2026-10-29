import { NextResponse, type NextRequest } from "next/server";
import { safeInternalRedirect } from "@/lib/redirects";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = safeInternalRedirect(
    request.nextUrl.searchParams.get("next"),
  );
  if (!code)
    return NextResponse.redirect(new URL("/login?auth=invalid", request.url));

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error)
      return NextResponse.redirect(new URL("/login?auth=invalid", request.url));
  } catch {
    return NextResponse.redirect(
      new URL("/login?auth=unavailable", request.url),
    );
  }
  return NextResponse.redirect(new URL(destination, request.url));
}
