"use client";
import { useState } from "react";
import { CalendarDays, ChevronDown, Lightbulb } from "lucide-react";
import { useQuiz } from "@/lib/store/quiz";
import { useHydrated } from "@/lib/useHydrated";
import { QUESTIONS, TOPIC_LABEL, dayKey, dayScore, pastDays, playStreak } from "@/lib/quiz/questions";
import { Card, CardHeader } from "@/components/ui/card";
import { DailyQuiz, formatDay } from "./DailyQuiz";
import { cn } from "@/lib/utils";

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
const upperFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function QuizStats() {
  const hydrated = useHydrated();
  const history = useQuiz((s) => s.history);
  const [open, setOpen] = useState<string | null>(null);
  if (!hydrated) return null;

  const today = dayKey();
  const answers = Object.entries(history).flatMap(([day, perQ]) =>
    Object.entries(perQ).map(([id, a]) => ({ day, id, ...a })),
  );
  const correct = answers.filter((a) => a.correct).length;
  const streak = playStreak(history, today);

  const stats = [
    { label: "Beantwoord", value: String(answers.length) },
    { label: "Goed", value: answers.length ? `${Math.round((correct / answers.length) * 100)}%` : "—" },
    { label: "Reeks", value: `🔥 ${streak}` },
  ];

  const days = pastDays(today);
  const facts = answers
    .map((a) => ({ ...a, q: BY_ID.get(a.id) }))
    .filter((a) => a.q)
    .sort((a, b) => b.day.localeCompare(a.day));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-panel/80 p-3 text-center">
            <div className="text-xl font-bold tabular">{s.value}</div>
            <div className="text-[11px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {days.length > 0 && (
        <Card>
          <CardHeader
            icon={<CalendarDays className="h-4 w-4" />}
            title="Vorige dagen"
            subtitle="Een dag gemist? Haal de vragen hier in. Ingehaalde vragen tellen niet mee voor je reeks."
          />
          <ul className="divide-y divide-border">
            {days.map((day) => {
              const s = dayScore(history, day);
              const isOpen = open === day;
              return (
                <li key={day}>
                  <button
                    onClick={() => setOpen(isOpen ? null : day)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-panel-2/50"
                    aria-expanded={isOpen}
                  >
                    <span>{upperFirst(formatDay(day))}</span>
                    <span className="flex items-center gap-2">
                      {s.answered === s.total ? (
                        <span className={cn("text-xs font-semibold", s.correct === s.total ? "text-bull" : "text-muted")}>
                          {s.correct}/{s.total} goed
                        </span>
                      ) : (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                          {s.answered ? `Nog ${s.total - s.answered} open` : "Inhalen"}
                        </span>
                      )}
                      <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", isOpen && "rotate-180")} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3">
                      <DailyQuiz key={day} day={day} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader
          icon={<Lightbulb className="h-4 w-4" />}
          title={`Jouw verzamelde weetjes${facts.length ? ` (${facts.length})` : ""}`}
          subtitle="Bij elke vraag die je beantwoordt, komt er één bij."
        />
        {facts.length === 0 ? (
          <p className="p-4 text-sm text-muted">Beantwoord de vragen van vandaag om je eerste weetjes te verzamelen.</p>
        ) : (
          <ul className="divide-y divide-border">
            {facts.map(({ day, id, correct: ok, q }) => (
              <li key={`${day}:${id}`} className="space-y-1 p-4">
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                  <span>
                    {formatDay(day, false)} · {TOPIC_LABEL[q!.topic]}
                  </span>
                  <span className={cn("font-semibold", ok ? "text-bull" : "text-bear")}>{ok ? "Goed" : "Fout"}</span>
                </div>
                <p className="text-sm font-medium">{q!.question}</p>
                <p className="text-sm text-muted">{q!.fact}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
