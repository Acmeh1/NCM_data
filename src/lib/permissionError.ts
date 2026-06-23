export function handleDbError(error: { message: string; code?: string }, fallbackMsg: string) {
  if (error.message?.includes("row-level security") || error.code === "42501") {
    return "Vous n'avez pas la permission de modifier ces données. Contactez un administrateur.";
  }
  if (error.message?.includes("duplicate key value") || error.code === "23505") {
    return "Cette production (même date, horaire, et modèle) a déjà été saisie !";
  }
  return fallbackMsg + ": " + error.message;
}
