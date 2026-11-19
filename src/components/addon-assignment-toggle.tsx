"use client";

export function AddonAssignmentToggle({ assigned }: { assigned: boolean }) {
  return (
    <input
      defaultChecked={assigned}
      name="assigned"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      type="checkbox"
    />
  );
}
