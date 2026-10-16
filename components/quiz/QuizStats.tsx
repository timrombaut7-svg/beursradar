"use client";
import { Lightbulb } from "lucide-react";
import { useQuiz } from "@/lib/store/quiz";
import { useHydrated } from "@/lib/useHydrated";
import { QUESTIONS, TOPIC_LABEL, dayKey, playStreak } from "@/lib/quiz/questions";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

function formatDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function QuizStats() {
  const hydrated = useHydrated();
  const history = useQuiz((s) => s.history);
  if (!hydrated) return null;

  const entries = Object.entries(history).sort(([a], [b]) => b.localeCompare(a));
  const played = entries.length;
  const correct = entries.filter(([, r]) => r.correct).length;
  const streak = playStreak(history, dayKey());

  const stats = [
    { label: "Gespeeld", value: String(played) },
    { label: "Goed", value: played ? `${Math.round((correct / played) * 100)}%` : "—" },
    { label: "Reeks", value: `🔥 ${streak}` },
  ];

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
      <Card>
        <CardHeader icon={<Lightbulb className="h-4 w-4" />} title="Jouw verzamelde weetjes" subtitle="Elke dag dat je speelt, komt er één bij." />
        {entries.length === 0 ? (
          <p className="p-4 text-sm text-muted">Beantwoord de vraag van vandaag om je eerste weetje te verzamelen.</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map(([day, r]) => {
              const q = BY_ID.get(r.questionId);
              if (!q) return null;
              return (
                <li key={day} className="space-y-1 p-4">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                    <span>
                      {formatDay(day)} · {TOPIC_LABEL[q.topic]}
                    </span>
                    <span className={cn("font-semibold", r.correct ? "text-bull" : "text-bear")}>{r.correct ? "Goed" : "Fout"}</span>
                  </div>
                  <p className="text-sm font-medium">{q.question}</p>
                  <p className="text-sm text-muted">{q.fact}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
