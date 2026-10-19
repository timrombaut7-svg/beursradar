"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QuizAnswer, QuizHistory } from "@/lib/quiz/questions";

interface QuizState {
  history: QuizHistory;
  /** Eén antwoord per vraag per dag: een tweede klik telt niet. */
  answer: (day: string, questionId: string, answer: QuizAnswer) => void;
}

/** Zet opgeslagen antwoorden van oudere versies om. Versie 1 had één vraag per dag: { [dag]: { questionId, choice, correct } }. */
export function migrateQuiz(persisted: unknown, version: number): { history?: QuizHistory } {
  const state = (persisted ?? {}) as { history?: Record<string, unknown> };
  if (version < 2 && state.history) {
    const old = state.history as Record<string, { questionId: string; choice: string; correct: boolean }>;
    return {
      ...state,
      history: Object.fromEntries(
        Object.entries(old).map(([day, r]) => [day, { [r.questionId]: { choice: r.choice, correct: r.correct } }]),
      ),
    };
  }
  return state as { history?: QuizHistory };
}

export const useQuiz = create<QuizState>()(
  persist(
    (set) => ({
      history: {},
      answer: (day, questionId, answer) =>
        set((s) =>
          s.history[day]?.[questionId] ? s : { history: { ...s.history, [day]: { ...s.history[day], [questionId]: answer } } },
        ),
    }),
    {
      name: "beursradar-quiz",
      version: 2,
      migrate: (persisted, version) => migrateQuiz(persisted, version) as QuizState,
    },
  ),
);
