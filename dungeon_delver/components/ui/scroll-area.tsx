// =============================================================================
// 📘 FILE: components/ui/scroll-area.tsx
// =============================================================================
// 🎯 PURPOSE: A custom scrollable area with a styled scrollbar. Built on
//    @base-ui/react's ScrollArea primitive. Supports both vertical and
//    horizontal scrolling with a thin, themed scrollbar thumb.
//
// 🧠 REACT CONCEPT: Custom Scrollbar + Viewport Pattern
//    The ScrollArea primitive provides a VIEWPORT (the actual scrollable
//    container) and a separate SCROLLBAR that can be styled independently
//    of the browser's native scrollbar. This ensures consistent appearance
//    across browsers.
//
//    The viewport receives focus styles (`focus-visible:ring-3`) so keyboard
//    users can tab to scrollable regions. The Corner component fills the
//    gap when both scrollbars are visible.
//
// 🔧 HOW TO ALTER:
//    - Change scrollbar width: modify `data-vertical:w-2.5` in ScrollBar
//    - Change thumb color: modify `bg-border` in Thumb
//    - Change viewport focus ring: modify `focus-visible:ring-3` classes
// =============================================================================

"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
