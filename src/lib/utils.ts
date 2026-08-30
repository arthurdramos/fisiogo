import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Erros do Supabase (Postgrest) chegam como objeto { message, details, hint,
// code }, não como instância de Error — "e instanceof Error ? e.message :
// 'Erro'" perde a mensagem real nesses casos e só mostra "Erro" genérico.
export function extractErrorMessage(e: unknown): string | null {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return null;
}
