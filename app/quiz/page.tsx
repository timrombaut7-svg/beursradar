import type { Metadata } from "next";
import { Brain } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DailyQuiz } from "@/components/quiz/DailyQuiz";
import { QuizStats } from "@/components/quiz/QuizStats";

export const metadata: Metadata = { title: "Quiz van de dag" };

export default function QuizPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        icon={<Brain className="h-5 w-5" />}
        title="Quiz van de dag"
        subtitle="Elke dag één vraag over beleggen en crypto, met een weetje. Speel elke dag om je reeks te laten groeien."
      />
      <DailyQuiz />
      <QuizStats />
    </div>
  );
}
