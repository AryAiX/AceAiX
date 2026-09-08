export function throwIfError(error: { message: string } | null | undefined): void {
  if (error) throw new Error(error.message);
}
