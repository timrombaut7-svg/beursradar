"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Flame, Lightbulb, X } from "lucide-react";
import { useQuiz } from "@/lib/store/quiz";
import { useHydrated } from "@/lib/useHydrated";
import { useNow } from "@/lib/useNow";
import { TOPIC_LABEL, dayKey, playStreak, quizForDay } from "@/lib/quiz/questions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function untilMidnight(now: number): string {
  const t = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(now));
  const [h, m] = t.split(":").map(Number);
  const left = 24 * 60 - (h * 60 + m);
  const hh = Math.floor(left / 60);
  const mm = left % 60;
  return hh > 0 ? `${hh} u ${mm} min` : `${mm} min`;
}

function formatToday(now: number): string {
  return new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" }).format(new Date(now));
}

export function DailyQuiz({ compact = false }: { compact?: boolean }) {
  const hydrated = useHydrated();
  const now = useNow(30_000);
  const history = useQuiz((s) => s.history);
  const answer = useQuiz((s) => s.answer);

  if (!hydrated) return <Skeleton className={compact ? "h-72" : "h-96"} />;

  const today = dayKey(new Date(now));
  const quiz = quizForDay(today);
  const record = history[today];
  const done = Boolean(record && record.questionId === quiz.question.id);
  const streak = playStreak(history, today);

  return (
    <section className="quiz-card relative overflow-hidden rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-hold/15 text-lg" aria-hidden>
            🧠
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Quiz van de dag</h2>
            <p className="text-[11px] text-muted">
              {formatToday(now)} · {TOPIC_LABEL[quiz.question.topic]}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
            streak > 0 ? "border-hold/40 bg-hold/10 text-hold" : "border-border text-muted",
          )}
          title="Aantal dagen op rij gespeeld"
        >
          <Flame className="h-3.5 w-3.5" />
          {streak} {streak === 1 ? "dag" : "dagen"}
        </div>
      </div>

      <p className="mt-4 text-base font-semibold leading-snug sm:text-lg">{quiz.question.question}</p>

      <div className="mt-3 grid gap-2">
        {quiz.options.map((opt, i) => {
          const isCorrect = opt === quiz.question.correct;
          const picked = done && record?.choice === opt;
          return (
            <button
              key={opt}
              disabled={done}
              onClick={() => answer(today, { questionId: quiz.question.id, choice: opt, correct: isCorrect })}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                !done && "border-border bg-panel-2/60 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-panel-2 active:translate-y-0",
                done && isCorrect && "border-bull/60 bg-bull/10 text-text",
                done && picked && !isCorrect && "border-bear/60 bg-bear/10 text-text",
                done && !isCorrect && !picked && "border-border opacity-50",
              )}
            >
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold",
                  done && isCorrect ? "bg-bull text-black" : done && picked ? "bg-bear text-white" : "bg-panel text-muted",
                )}
              >
                {done && isCorrect ? <Check className="h-3.5 w-3.5" /> : done && picked ? <X className="h-3.5 w-3.5" /> : "ABCD"[i]}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {done && record && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4 space-y-3"
          >
            <p className={cn("text-sm font-semibold", record.correct ? "text-bull" : "text-bear")}>
              {record.correct ? "🎉 Goed zo!" : `Helaas, het juiste antwoord is: ${quiz.question.correct}`}
            </p>
            <div className="flex gap-3 rounded-xl border border-hold/30 bg-hold/10 p-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-hold" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-hold">Weetje</div>
                <p className="mt-0.5 text-sm leading-relaxed">{quiz.question.fact}</p>
              </div>
            </div>
            <p className="text-xs text-muted">Nieuwe vraag over {untilMidnight(now)}.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {compact && (
        <Link href="/quiz" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          Je score en eerdere weetjes <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}
