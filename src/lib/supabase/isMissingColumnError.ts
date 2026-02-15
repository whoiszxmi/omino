export function isMissingColumnError(error: { message?: string | null } | null | undefined, column: string) {
  if (!error?.message) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("column") &&
    message.includes(column.toLowerCase()) &&
    (message.includes("does not exist") || message.includes("schema cache"))
  );
}
