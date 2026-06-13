// =============================================================================
// 📘 FILE: lib/utils.ts
// =============================================================================
// 🎯 PURPOSE: Provides a single utility function `cn()` used by EVERY component
//    to combine and merge Tailwind CSS class names. This is the standard
//    shadcn/ui pattern — you'll see it on virtually every component.
//
// 🧠 REACT CONCEPT: Utility functions / helpers
//    Not all .ts files in a React project are components! Some are just plain
//    TypeScript modules that export helper functions. This file has no JSX,
//    no React imports — it's pure TypeScript. Components import and call
//    `cn()` when they need to build class name strings.
//
// 💡 Beginner note: The `export` keyword makes these functions available to
//    other files. `import { cn } from "@/lib/utils"` pulls it into a component.
//
// 🔧 HOW TO ALTER:
//    - Add more utility functions here (e.g., a `formatGold()` helper)
//    - The `cn()` function itself rarely needs changing — it's a standard
//      pattern used across thousands of projects. Only modify if you need
//      custom Tailwind merge behavior (advanced).
// =============================================================================

import { clsx, type ClassValue } from "clsx"
// 🧠 clsx: A tiny library that conditionally joins CSS class names.
//    Example: clsx('btn', isActive && 'btn-active')
//    → if isActive=true:  'btn btn-active'
//    → if isActive=false: 'btn'  (the false value is filtered out)
//    This lets you write conditional class logic without string concatenation.

import { twMerge } from "tailwind-merge"
// 🧠 tailwind-merge: Intelligently merges Tailwind classes, resolving conflicts.
//    Example: twMerge('px-4', 'px-6') → 'px-6' (the LAST padding-left value wins)
//    Without this, you'd get 'px-4 px-6' — both applied, unpredictable result.

// 🧠 `...inputs` is a "rest parameter" — it captures ALL function arguments
//    into an array. You can call it with any number of arguments:
//      cn('class1')                       → inputs = ['class1']
//      cn('base', isActive && 'active')   → inputs = ['base', 'active' or false]
//
// 🧠 `ClassValue` is the type from clsx — accepts strings, objects like
//    `{ active: true }`, arrays, or false/null/undefined (which get filtered).

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
  // Step 1: clsx(inputs) — condenses the array into a clean class string,
  //    filtering out any falsey values (false, null, undefined, 0, '')
  // Step 2: twMerge(result) — resolves conflicting Tailwind utilities so the
  //    last-applied class wins predictably
}
