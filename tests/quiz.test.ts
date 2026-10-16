import { describe, expect, it } from "vitest";
import { QUESTIONS, TOPIC_LABEL, dayKey, dayNumber, playStreak, quizForDay, shiftDay, type QuizRecord } from "@/lib/quiz/questions";

describe("vragenbank", () => {
  it("heeft unieke ids en vragen", () => {
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

describe("dagelijkse vraag", () => {
  it("wisselt om middernacht Nederlandse tijd", () => {
    // 22:30 UTC in de zomer = 00:30 in Amsterdam
    expect(dayKey(new Date("2026-07-14T21:30:00Z"))).toBe("2026-07-14");
    expect(dayKey(new Date("2026-07-14T22:30:00Z"))).toBe("2026-07-15");
  });

  it("geeft elke dag dezelfde vraag en opties voor iedereen", () => {
    const a = quizForDay("2026-10-16");
    const b = quizForDay("2026-10-16");
    expect(a).toEqual(b);
    expect(a.options).toContain(a.question.correct);
    expect(new Set(a.options)).toEqual(new Set([a.question.correct, ...a.question.wrong]));
  });

  it("loopt alle vragen langs voordat er een terugkomt", () => {
    const seen = new Set<string>();
    for (let i = 0; i < QUESTIONS.length; i++) seen.add(quizForDay(shiftDay("2026-10-16", i)).question.id);
    expect(seen.size).toBe(QUESTIONS.length);
  });

  it("zet het goede antwoord niet altijd op dezelfde plek", () => {
    const spots = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const q = quizForDay(shiftDay("2026-10-16", i));
      spots.add(q.options.indexOf(q.question.correct));
    }
    expect(spots.size).toBeGreaterThan(2);
  });

  it("telt dagen correct over maandgrenzen", () => {
    expect(shiftDay("2026-02-28", 1)).toBe("2026-03-01");
    expect(dayNumber("2026-01-01")).toBe(0);
    expect(dayNumber("2026-03-01")).toBe(59);
  });
});

describe("reeks", () => {
  const rec: QuizRecord = { questionId: "x", choice: "a", correct: true };

  it("telt opeenvolgende dagen, ook als vandaag nog open is", () => {
    const h = { "2026-10-13": rec, "2026-10-14": rec, "2026-10-15": rec };
    expect(playStreak(h, "2026-10-16")).toBe(3);
    expect(playStreak({ ...h, "2026-10-16": rec }, "2026-10-16")).toBe(4);
  });

  it("begint opnieuw na een gemiste dag", () => {
    expect(playStreak({ "2026-10-12": rec, "2026-10-14": rec }, "2026-10-16")).toBe(0);
    expect(playStreak({}, "2026-10-16")).toBe(0);
  });
});
