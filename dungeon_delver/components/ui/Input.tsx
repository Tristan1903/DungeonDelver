// =============================================================================
// 📘 FILE: components/ui/input.tsx
// =============================================================================
// 🎯 PURPOSE: A styled text input wrapping @base-ui/react's Input primitive.
//    Supports all standard HTML input types (text, number, email, etc.).
//
// 🧠 REACT CONCEPT: Primitive Wrapper + Forwarding Props
//    This is one of the simplest shadcn/ui patterns — a thin wrapper around
//    a base input that adds consistent styling via Tailwind. It accepts
//    ALL standard input props via `React.ComponentProps<"input">`, which
//    means any prop you can pass to `<input>` (placeholder, value, onChange,
//    disabled, etc.) works here too.
//
//    The `type` prop is destructured separately so it can be passed to the
//    underlying InputPrimitive properly.
//
// 🔧 HOW TO ALTER:
//    - Change input height: modify `h-8`
//    - Change border radius: modify `rounded-lg`
//    - Change focus ring: modify `focus-visible:ring-*` classes
//    - Change disabled style: modify `disabled:*` classes
// =============================================================================

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
