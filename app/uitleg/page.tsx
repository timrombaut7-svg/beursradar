import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Glossary } from "@/components/uitleg/Glossary";

export const metadata: Metadata = { title: "Woordenlijst" };

export default function UitlegPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        icon={<BookOpen className="h-5 w-5" />}
        title="Woordenlijst"
        subtitle="Alle moeilijke woorden en afkortingen uit de app, in gewone taal. Tip: in de app kun je ook op een onderstreept woord tikken."
      />
      <Glossary />
    </div>
  );
}
