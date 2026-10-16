import { Suspense } from "react";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ChatView } from "@/components/chat/ChatView";

export const metadata: Metadata = { title: "AI-assistent" };

export default function AssistentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader
        icon={<Sparkles className="h-5 w-5" />}
        title="AI-assistent"
        subtitle={
          <>
            Vraag alles over aandelen, crypto of je portfolio. Antwoorden zijn gebaseerd op de live analyses van Beursradar.
          </>
        }
      />
      <Suspense>
        <ChatView />
      </Suspense>
    </div>
  );
}
