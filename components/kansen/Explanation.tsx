import { CalendarClock, ClipboardList, ThumbsUp, TriangleAlert } from "lucide-react";
import type { SignalExplanation } from "@/types";

/** Uitleg in makkelijke taal: waarom, waar op letten, het plan en hoe lang houden. */
export function Explanation({ explanation }: { explanation: SignalExplanation }) {
  const { headline, why, risks, plan, hold } = explanation;
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold leading-snug">{headline}</p>
      {why.length > 0 && (
        <Section icon={<ThumbsUp className="h-4 w-4" />} title="Waarom kopen?" tone="text-bull">
          <ul className="list-disc space-y-1 pl-5">
            {why.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Section>
      )}
      {risks.length > 0 && (
        <Section icon={<TriangleAlert className="h-4 w-4" />} title="Let op" tone="text-hold">
          <ul className="list-disc space-y-1 pl-5">
            {risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>
      )}
      <Section icon={<ClipboardList className="h-4 w-4" />} title="Het plan" tone="text-accent">
        <p>{plan}</p>
      </Section>
      <Section icon={<CalendarClock className="h-4 w-4" />} title="Hoe lang houden?" tone="text-accent">
        <p>{hold}</p>
      </Section>
    </div>
  );
}

function Section({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${tone}`}>
        {icon} {title}
      </p>
      <div className="leading-relaxed text-text/90">{children}</div>
    </div>
  );
}
