// =============================================================================
// 📘 FILE: components/ui/separator.tsx
// =============================================================================
// 🎯 PURPOSE: A visual divider line between sections. Built on
//    @base-ui/react's Separator primitive. Supports horizontal (default)
//    and vertical orientations. Renders as a <div> with role="separator"
//    and appropriate ARIA attributes.
//
// 🧠 REACT CONCEPT: Thin Wrapper — Smallest Possible Component
//    At just 11 lines of logic, Separator is the simplest kind of wrapper:
//    it takes a className, an orientation prop, and passes everything else
//    to the primitive. The real work is done by CSS `data-horizontal:` /
//    `data-vertical:` attribute selectors that apply the correct dimensions.
//
// 🔧 HOW TO ALTER:
//    - Change line thickness: modify `h-px` (horizontal) / `w-px` (vertical)
//    - Change color: modify `bg-border` to another theme color
//    - Add margins or spacing: add `mx-2` / `my-2` to className
// =============================================================================

"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
