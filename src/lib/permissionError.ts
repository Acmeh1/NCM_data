export function handleDbError(error: { message: string; code?: string }, fallbackMsg: string) {
  if (error.message?.includes("row-level security") || error.code === "42501") {
    return "Vous n'avez pas la permission de modifier ces données. Contactez un administrateur.";
  }
  return fallbackMsg + ": " + error.message;
}
