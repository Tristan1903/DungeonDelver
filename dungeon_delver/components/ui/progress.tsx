// =============================================================================
// 📘 FILE: components/ui/progress.tsx
// =============================================================================
// 🎯 PURPOSE: A progress/loading bar built on @base-ui/react's Progress
//    primitive. Composed of track, indicator, label, and value display.
//    Uses the ARIA progressbar role for accessibility.
//
// 🧠 REACT CONCEPT: Accessible Wrapper + Internal Composition
//    Unlike other compound components where the consumer composes children,
//    Progress renders its own sub-components internally (ProgressTrack +
//    ProgressIndicator are always inside the root). The consumer just
//    provides `value` and optional children for label/value.
//
//    @base-ui/react's Progress primitive handles ARIA attributes
//    (role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax)
//    automatically based on the `value` prop.
//
// 🔧 HOW TO ALTER:
//    - Change bar height: modify `h-1` in ProgressTrack
//    - Change indicator color: modify `bg-primary` in ProgressIndicator
//    - Change label position: modify Flexbox layout in Progress.Root
// =============================================================================

"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  children,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("h-full bg-primary transition-all", className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-sm font-medium", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-sm text-muted-foreground tabular-nums",
        className
      )}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}
