// Importações para combinar classes CSS
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Função utilitária para combinar e mesclar classes CSS
 * Usa clsx para condicionais e twMerge para resolver conflitos de Tailwind
 * @param inputs - Array de classes CSS para combinar
 * @returns String com classes CSS combinadas e sem conflitos
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
