/**
 * @file cn.ts
 * @description Utility for merging Tailwind CSS class names with clsx and tailwind-merge.
 * This is the standard shadcn/ui pattern for conditional class composition.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names intelligently, resolving Tailwind conflicts.
 * @param inputs - Any number of class values (strings, arrays, objects)
 * @returns Merged, conflict-resolved class string
 *
 * @example
 * cn("px-4 py-2", condition && "text-red-500", "px-6") // → "py-2 text-red-500 px-6"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
