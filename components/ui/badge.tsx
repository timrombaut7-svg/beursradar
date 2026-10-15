import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const badge = cva("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", {
  variants: {
    tone: {
      bull: "border-bull/40 bg-bull/10 text-bull",
      bear: "border-bear/40 bg-bear/10 text-bear",
      hold: "border-hold/40 bg-hold/10 text-hold",
      neutral: "border-border bg-panel-2 text-muted",
      accent: "border-accent/40 bg-accent/10 text-accent",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
