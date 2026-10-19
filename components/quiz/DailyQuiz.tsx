"use client";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronRight, Flame, Lightbulb, X } from "lucide-react";
import { useQuiz } from "@/lib/store/quiz";
import { useHydrated } from "@/lib/useHydrated";
import { useNow } from "@/lib/useNow";
import { TOPIC_LABEL, dayKey, dayScore, playStreak, quizForDay } from "@/lib/quiz/questions";
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

export function formatDay(key: string, withWeekday = true): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: withWeekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * De quiz van één dag (standaard vandaag): drie vragen na elkaar, met na elk antwoord een weetje.
 * Een eerdere dag kan worden ingehaald; die antwoorden tellen dan niet mee voor de reeks.
 */
export function DailyQuiz({ compact = false, day: dayProp }: { compact?: boolean; day?: string }) {
  const hydrated = useHydrated();
  const now = useNow(30_000);
  const history = useQuiz((s) => s.history);
  const answer = useQuiz((s) => s.answer);
  const [picked, setPicked] = useState<number | null>(null);

  if (!hydrated) return <Skeleton className={compact ? "h-72" : "h-96"} />;

  const today = dayKey(new Date(now));
  const day = dayProp ?? today;
  const isToday = day === today;
  const quiz = quizForDay(day);
  const answers = history[day] ?? {};
  const firstOpen = quiz.items.findIndex((i) => !answers[i.question.id]);
  // Na een antwoord blijft die vraag (met weetje) staan tot je op "Volgende" tikt
  const idx = picked ?? (firstOpen === -1 ? quiz.items.length - 1 : firstOpen);
  const item = quiz.items[idx];
  const record = answers[item.question.id];
  const done = Boolean(record);
  const score = dayScore(history, day);
  const allDone = score.answered === score.total;
  const streak = playStreak(history, today);

  return (
    <section className="quiz-card relative overflow-hidden rounded-2xl border border-border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-hold/15 text-lg" aria-hidden>
            🧠
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{isToday ? "Quiz van de dag" : "Quiz inhalen"}</h2>
            <p className="text-[11px] text-muted">
              {formatDay(day)} · {TOPIC_LABEL[item.question.topic]}
            </p>
          </div>
        </div>
        {isToday && (
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
        )}
      </div>

      {/* Voortgang: één bolletje per vraag */}
      <div className="mt-3 flex items-center gap-1.5" aria-label={`Vraag ${idx + 1} van ${quiz.items.length}`}>
        {quiz.items.map((it, i) => {
          const a = answers[it.question.id];
          return (
            <button
              key={it.question.id}
              onClick={() => setPicked(i)}
              aria-label={`Vraag ${i + 1}`}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                a ? (a.correct ? "bg-bull" : "bg-bear") : "bg-panel-2",
                i === idx && "ring-2 ring-text/30 ring-offset-1 ring-offset-panel",
              )}
            />
          );
        })}
        <span className="ml-1 text-[11px] text-muted tabular">
          {idx + 1}/{quiz.items.length}
        </span>
      </div>

      <p className="mt-3 text-base font-semibold leading-snug sm:text-lg">{item.question.question}</p>

      <div className="mt-3 grid gap-2">
        {item.options.map((opt, i) => {
          const isCorrect = opt === item.question.correct;
          const chosen = done && record?.choice === opt;
          return (
            <button
              key={opt}
              disabled={done}
              onClick={() => {
                answer(day, item.question.id, { choice: opt, correct: isCorrect, ...(isToday ? {} : { late: true }) });
                setPicked(idx);
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                !done && "border-border bg-panel-2/60 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-panel-2 active:translate-y-0",
                done && isCorrect && "border-bull/60 bg-bull/10 text-text",
                done && chosen && !isCorrect && "border-bear/60 bg-bear/10 text-text",
                done && !isCorrect && !chosen && "border-border opacity-50",
              )}
            >
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold",
                  done && isCorrect ? "bg-bull text-black" : done && chosen ? "bg-bear text-white" : "bg-panel text-muted",
                )}
              >
                {done && isCorrect ? <Check className="h-3.5 w-3.5" /> : done && chosen ? <X className="h-3.5 w-3.5" /> : "ABCD"[i]}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {done && record && (
          <motion.div
            key={item.question.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4 space-y-3"
          >
            <p className={cn("text-sm font-semibold", record.correct ? "text-bull" : "text-bear")}>
              {record.correct ? "🎉 Goed zo!" : `Helaas, het juiste antwoord is: ${item.question.correct}`}
            </p>
            <div className="flex gap-3 rounded-xl border border-hold/30 bg-hold/10 p-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-hold" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-hold">Weetje</div>
                <p className="mt-0.5 text-sm leading-relaxed">{item.question.fact}</p>
              </div>
            </div>
            {idx < quiz.items.length - 1 ? (
              <button
                onClick={() => setPicked(idx + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
              >
                {answers[quiz.items[idx + 1].question.id] ? "Bekijk vraag" : "Volgende vraag"} {idx + 2}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : allDone ? (
              <p className="text-sm">
                Klaar: <span className="font-semibold">{score.correct} van de {score.total}</span> goed.{" "}
                {isToday ? <span className="text-muted">Nieuwe vragen over {untilMidnight(now)}.</span> : null}
              </p>
            ) : (
              <button
                onClick={() => setPicked(firstOpen)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
              >
                Nog open: vraag {firstOpen + 1} <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {compact && (
        <Link href="/quiz" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          Vorige dagen inhalen en je weetjes <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}
