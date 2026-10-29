export function safeInternalRedirect(value: FormDataEntryValue | string | string[] | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }
  if (value.includes("\\") || value.includes("\r") || value.includes("\n")) {
    return "/account";
  }
  return value;
}
