import type { ReactNode } from "react";
import { CustomerWorkspace } from "@/components/customer-workspace";
import { requireCustomer } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/config";

export default async function CustomerAccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  let email = "";
  let customerName = "";
  if (getSupabaseConfig()) {
    const { supabase, user } = await requireCustomer("/account");
    email = user.email ?? "";
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    customerName = profile?.full_name?.trim() || "";
  }

  return (
    <CustomerWorkspace customerName={customerName} email={email}>
      {children}
    </CustomerWorkspace>
  );
}
