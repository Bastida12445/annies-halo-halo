import type { ShopActionState } from "@/app/actions/shop";
import { AdminActionForm } from "@/components/admin-action-form";

export function AdminDeleteAction({
  action,
  id,
  fieldName,
  itemName,
}: {
  action: (state: ShopActionState, formData: FormData) => Promise<ShopActionState>;
  id: string;
  fieldName: "product_id" | "category_id";
  itemName: string;
}) {
  return (
    <AdminActionForm
      action={action}
      buttonClassName="admin-icon-action is-danger"
      className="admin-delete-form"
      confirmMessage={`Delete “${itemName}”? This cannot be undone.`}
      submitLabel="Delete"
    >
      <input name={fieldName} type="hidden" value={id} />
      <span className="sr-only">Delete {itemName}</span>
    </AdminActionForm>
  );
}
