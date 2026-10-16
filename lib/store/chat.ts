"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  accessCode: string;
  add: (m: ChatMessage) => void;
  update: (id: string, patch: Partial<ChatMessage>) => void;
  appendText: (id: string, delta: string) => void;
  clear: () => void;
  setAccessCode: (code: string) => void;
}

export const useChat = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      accessCode: "",
      add: (m) => set((s) => ({ messages: [...s.messages, m].slice(-40) })),
      update: (id, patch) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      appendText: (id, delta) =>
        set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m)) })),
      clear: () => set({ messages: [] }),
      setAccessCode: (accessCode) => set({ accessCode }),
    }),
    { name: "beursradar-chat", version: 1 },
  ),
);
