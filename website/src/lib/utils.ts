import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * This function combines the clsx and tailwind-merge libraries to create a utility function for conditional class names.
 * It allows you to conditionally apply classes based on if the input is true or not.
 * The twMerge function is used to merge Tailwind CSS classes, resolving any conflicts between them.
 *
 * @param inputs - An array of class names or conditional class names.
 * @returns A string of merged class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
