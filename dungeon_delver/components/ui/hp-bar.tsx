// =============================================================================
// 📘 FILE: components/ui/hp-bar.tsx
// =============================================================================
// 🎯 PURPOSE: A custom hit point progress bar specific to the D&D character
//    sheet. Shows current/max HP with color thresholds (green > 60%, amber
//    > 30%, red ≤ 30%) and configurable size. Not a shadcn/ui wrapper —
//    built from scratch for this app.
//
// 🧠 REACT CONCEPT: Derived State + Conditional Styling
//    The bar's color and width are derived from props (current, max) using
//    pure functions (hpColor, hpColorVar). This is "derived state" — values
//    computed from other values, not stored separately.
//
//    The component also conditionally renders the HP label as a sub-component
//    based on the `showLabel` prop. This is "conditional rendering" —
//    one of React's most fundamental patterns.
//
// 🔧 HOW TO ALTER:
//    - Change color thresholds: modify hpColor / hpColorVar
//    - Change bar sizes: modify heights / fontSizes objects
//    - Change animation: modify `transition-all duration-300` class
// =============================================================================

"use client"

import { cn } from "@/lib/utils"

interface HPBarProps {
  current: number
  max: number
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const heights = { sm: 6, md: 10, lg: 18 }
const fontSizes = { sm: "text-[0.6rem]", md: "text-[0.7rem]", lg: "text-[0.85rem]" }

function hpColor(pct: number): string {
  if (pct > 0.6) return "bg-emerald-600"
  if (pct > 0.3) return "bg-amber-500"
  return "bg-red-700"
}

function hpColorVar(pct: number): string {
  if (pct > 0.6) return "#16a34a"
  if (pct > 0.3) return "#d97706"
  return "#b91c1c"
}

export function HPBar({ current, max, showLabel, size = "md", className }: HPBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
  const h = heights[size]

  return (
    <div className={className}>
      {showLabel && (
        <div className={cn("flex justify-between mb-1", fontSizes[size])}>
          <span className="text-muted-foreground">HP</span>
          <span className="font-bold text-foreground">
            {current} / {max}
          </span>
        </div>
      )}
      <div
        className="w-full overflow-hidden bg-black/30 rounded-full"
        style={{ height: h }}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", hpColor(pct / 100))}
          style={{ width: `${pct}%`, backgroundColor: hpColorVar(pct / 100) }}
        />
      </div>
    </div>
  )
}
