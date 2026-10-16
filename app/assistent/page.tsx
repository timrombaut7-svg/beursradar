import { Suspense } from "react";
import type { Metadata } from "next";
import { ChatView } from "@/components/chat/ChatView";

export const metadata: Metadata = { title: "AI-assistent" };

export default function AssistentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI-assistent</h1>
        <p className="text-sm text-muted">Vraag alles over aandelen, crypto of je portfolio. Antwoorden zijn gebaseerd op de live analyses van Beursradar.</p>
      </div>
      <Suspense>
        <ChatView />
      </Suspense>
    </div>
  );
}
