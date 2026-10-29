import type { Metadata } from "next";
import { AdminActionForm } from "@/components/admin-action-form";
import { AdminShell } from "@/components/admin-shell";
import { assignStaffRoleAction } from "@/app/actions/shop";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Staff access" };

export default async function AdminStaffPage() {
  const { supabase, roles: staffRoles } = await requireStaff(["administrator"]);
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("id,user_id,role,created_at")
    .order("created_at");
  return (
    <AdminShell title="Staff access" roles={staffRoles}>
      <div className="content-card">
        <h2>Assign or remove a role</h2>
        <p>
          Staff must register and verify an account first. Use the account email
          here. New accounts receive no staff access unless an administrator
          explicitly assigns it.
        </p>
        <AdminActionForm
          action={assignStaffRoleAction}
          submitLabel="Update staff access"
          className="form-stack"
        >
          <label className="field-label">
            Account email
            <input type="email" name="email" required maxLength={254} />
          </label>
          <label className="field-label">
            Role
            <select name="role" required>
              <option value="administrator">Administrator</option>
              <option value="order_manager">Order manager</option>
              <option value="menu_manager">Menu manager</option>
              <option value="reservation_manager">Reservation manager</option>
            </select>
          </label>
          <label>
            <input type="checkbox" name="enabled" defaultChecked /> Assign this
            role (uncheck to remove)
          </label>
        </AdminActionForm>
        <p className="field-help">
          The database prevents removing the last administrator. Role changes
          are recorded in the audit log.
        </p>
      </div>
      <div className="content-card">
        <h2>Current staff roles</h2>
        {error && (
          <p className="form-error">Staff roles could not be loaded.</p>
        )}
        {roles?.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account ID</th>
                  <th>Role</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td>{role.user_id}</td>
                    <td>{role.role.replaceAll("_", " ")}</td>
                    <td>
                      {new Date(role.created_at).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !error ? (
          <p>No staff roles found.</p>
        ) : null}
      </div>
    </AdminShell>
  );
}
