
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRandomColor() {
  const colors = [
    '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#6366f1',
    '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'
  ];
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}
