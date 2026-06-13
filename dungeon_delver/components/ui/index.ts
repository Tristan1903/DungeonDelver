// =============================================================================
// 📘 FILE: components/ui/index.ts
// =============================================================================
// 🎯 PURPOSE: Barrel (re-export) file for all shadcn/ui components. Lets
//    consumers import from `@/components/ui` instead of individual files.
//
// 🧠 REACT CONCEPT: Barrel Files — Organizing a Component Library
//    A barrel file collects and re-exports multiple modules from a single
//    entry point. This is not a React feature but a TypeScript/JavaScript
//    module pattern. It simplifies imports:
//      import { Button, Card, Input, Dialog } from "@/components/ui"
//    Instead of 4 separate import lines from individual files.
//
// 🔧 HOW TO ALTER:
//    - Add new component: add its export line here
//    - Remove component: delete the line (tree-shaking will exclude it)
// =============================================================================

export { Button, buttonVariants } from "./button"
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "./card"
export { Input } from "./input"
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog"
export { Badge, badgeVariants } from "./badge"
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs"
export { HPBar } from "./hp-bar"
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select"
export { Toggle, toggleVariants } from "./toggle"
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip"
export { ScrollArea } from "./scroll-area"
export { Separator } from "./separator"
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu"
export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./sheet"
export { Textarea } from "./textarea"
export { Progress } from "./progress"
