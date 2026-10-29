import type { ReactNode } from "react";
import { AdminWorkspace } from "@/components/admin-workspace";
import { requireStaff } from "@/lib/auth";
import type { StaffRole } from "@/types/database";

const workspaceRoles: StaffRole[] = [
  "administrator",
  "order_manager",
  "menu_manager",
  "reservation_manager",
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, roles } = await requireStaff(workspaceRoles);

  return (
    <AdminWorkspace email={user.email ?? ""} roles={roles}>
      {children}
    </AdminWorkspace>
  );
}
