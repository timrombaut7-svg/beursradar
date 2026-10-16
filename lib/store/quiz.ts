"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QuizRecord } from "@/lib/quiz/questions";

interface QuizState {
  /** Antwoorden per dag ("YYYY-MM-DD") */
  history: Record<string, QuizRecord>;
  answer: (day: string, record: QuizRecord) => void;
}

export const useQuiz = create<QuizState>()(
  persist(
    (set) => ({
      history: {},
      // Eén antwoord per vraag per dag: een tweede klik telt niet.
      answer: (day, record) =>
        set((s) =>
          s.history[day]?.questionId === record.questionId ? s : { history: { ...s.history, [day]: record } },
        ),
    }),
    { name: "beursradar-quiz", version: 1 },
  ),
);
