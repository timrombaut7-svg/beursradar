import { describe, expect, it } from "vitest";
import {
  QUESTIONS,
  QUESTIONS_PER_DAY,
  QUIZ_START,
  TOPIC_LABEL,
  dayKey,
  dayNumber,
  dayScore,
  pastDays,
  playStreak,
  quizForDay,
  shiftDay,
  type QuizHistory,
} from "@/lib/quiz/questions";

describe("vragenbank", () => {
  it("heeft ruim honderd vragen met unieke ids en vragen", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    expect(new Set(QUESTIONS.map((q) => q.question)).size).toBe(QUESTIONS.length);
  });

  it("heeft per vraag 4 verschillende antwoorden, een weetje en een bekend onderwerp", () => {
    for (const q of QUESTIONS) {
      const all = [q.correct, ...q.wrong];
      expect(all, q.id).toHaveLength(4);
      expect(new Set(all).size, q.id).toBe(4);
      expect(q.fact.length, q.id).toBeGreaterThan(30);
      expect(TOPIC_LABEL[q.topic], q.id).toBeTruthy();
    }
  });
});

describe("dagelijkse vragen", () => {
  it("wisselt om middernacht Nederlandse tijd", () => {
    // 22:30 UTC in de zomer = 00:30 in Amsterdam
    expect(dayKey(new Date("2026-07-14T21:30:00Z"))).toBe("2026-07-14");
    expect(dayKey(new Date("2026-07-14T22:30:00Z"))).toBe("2026-07-15");
  });

  it("geeft elke dag drie verschillende vragen, voor iedereen dezelfde", () => {
    const a = quizForDay("2026-10-16");
    expect(a).toEqual(quizForDay("2026-10-16"));
    expect(a.items).toHaveLength(QUESTIONS_PER_DAY);
    expect(new Set(a.items.map((i) => i.question.id)).size).toBe(QUESTIONS_PER_DAY);
    for (const i of a.items) expect(new Set(i.options)).toEqual(new Set([i.question.correct, ...i.question.wrong]));
  });

  it("loopt alle vragen langs voordat er een terugkomt", () => {
    const days = Math.ceil(QUESTIONS.length / QUESTIONS_PER_DAY);
    const seen = new Set<string>();
    for (let d = 0; d < days; d++) for (const i of quizForDay(shiftDay("2026-10-16", d)).items) seen.add(i.question.id);
    expect(seen.size).toBe(QUESTIONS.length);
  });

  it("zet het goede antwoord niet altijd op dezelfde plek", () => {
    const spots = new Set<number>();
    for (let d = 0; d < 10; d++) for (const i of quizForDay(shiftDay("2026-10-16", d)).items) spots.add(i.options.indexOf(i.question.correct));
    expect(spots.size).toBeGreaterThan(2);
  });

  it("telt dagen correct over maandgrenzen", () => {
    expect(shiftDay("2026-02-28", 1)).toBe("2026-03-01");
    expect(dayNumber("2026-01-01")).toBe(0);
    expect(dayNumber("2026-03-01")).toBe(59);
  });

  it("biedt eerdere dagen aan om in te halen, maar niet van vóór de start", () => {
    expect(pastDays("2026-10-20")).toEqual(["2026-10-19", "2026-10-18", "2026-10-17", "2026-10-16"]);
    expect(pastDays(QUIZ_START)).toEqual([]);
    expect(pastDays("2027-03-01", 14)).toHaveLength(14);
  });
});

describe("score en reeks", () => {
  const ids = (day: string) => quizForDay(day).items.map((i) => i.question.id);
  const answer = (correct: boolean, late = false) => ({ choice: "x", correct, ...(late ? { late } : {}) });

  it("telt alleen de vragen van die dag", () => {
    const [a, b] = ids("2026-10-16");
    const h: QuizHistory = { "2026-10-16": { [a]: answer(true), [b]: answer(false), "een-andere-vraag": answer(true) } };
    expect(dayScore(h, "2026-10-16")).toEqual({ answered: 2, correct: 1, total: 3 });
  });

  it("telt opeenvolgende dagen, ook als vandaag nog open is", () => {
    const h: QuizHistory = {};
    for (const d of ["2026-10-13", "2026-10-14", "2026-10-15"]) h[d] = { [ids(d)[0]]: answer(true) };
    expect(playStreak(h, "2026-10-16")).toBe(3);
    h["2026-10-16"] = { [ids("2026-10-16")[0]]: answer(false) };
    expect(playStreak(h, "2026-10-16")).toBe(4);
  });

  it("begint opnieuw na een gemiste dag, en ingehaalde dagen tellen niet mee", () => {
    const h: QuizHistory = {
      "2026-10-12": { [ids("2026-10-12")[0]]: answer(true) },
      "2026-10-14": { [ids("2026-10-14")[0]]: answer(true) },
      "2026-10-15": { [ids("2026-10-15")[0]]: answer(true, true) },
    };
    expect(playStreak(h, "2026-10-16")).toBe(0);
    expect(playStreak({}, "2026-10-16")).toBe(0);
  });
});

describe("opslag", () => {
  it("zet antwoorden van de oude versie (één vraag per dag) om", async () => {
    const { migrateQuiz } = await import("@/lib/store/quiz");
    const old = { history: { "2026-10-16": { questionId: "ipo", choice: "Een beursvakantie", correct: false } } };
    expect(migrateQuiz(old, 1).history).toEqual({ "2026-10-16": { ipo: { choice: "Een beursvakantie", correct: false } } });
    // Nieuwe opslag blijft ongewijzigd
    const current = { history: { "2026-10-17": { ipo: { choice: "a", correct: true } } } };
    expect(migrateQuiz(current, 2)).toEqual(current);
  });
});
