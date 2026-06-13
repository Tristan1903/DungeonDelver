// =============================================================================
// 📘 FILE: components/ui/textarea.tsx
// =============================================================================
// 🎯 PURPOSE: A styled multi-line text input for longer text (notes,
//    descriptions, etc.). Applies consistent dark-themed styling with
//    focus ring, placeholder styling, disabled state, and aria-invalid
//    error borders.
//
// 🧠 REACT CONCEPT: Direct HTML Element Wrapping
//    Unlike many UI components that wrap @base-ui/react primitives, Textarea
//    wraps the native HTML <textarea> directly. It just applies Tailwind
//    classes via cn(). This is the simplest form of a React component: a
//    "styled wrapper" around a native element.
//
//    Note: this file is NOT a `'use client'` component because it doesn't
//    use hooks or event handlers — the native <textarea> handles all
//    interactions. The `'use client'` boundary is at the consumer level.
//
// 🔧 HOW TO ALTER:
//    - Change min height: modify `min-h-16`
//    - Change auto-resize behavior: modify `field-sizing-content`
//    - Change padding: modify `px-2.5 py-2`
//    - Change font size: modify `text-base md:text-sm`
// =============================================================================

import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
