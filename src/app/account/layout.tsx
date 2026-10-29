import type { ReactNode } from "react";
import { CustomerWorkspace } from "@/components/customer-workspace";
import { requireCustomer } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/config";

export default async function CustomerAccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = getSupabaseConfig()
    ? (await requireCustomer("/account")).user
    : null;

  return (
    <CustomerWorkspace email={user?.email ?? ""}>
      {children}
    </CustomerWorkspace>
  );
}
