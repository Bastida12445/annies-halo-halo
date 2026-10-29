export function formatPhp(cents: number, locale = "en-PH") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDateTime(value: string, locale = "en-PH") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}
