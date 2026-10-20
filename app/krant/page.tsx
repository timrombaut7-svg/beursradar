import type { Metadata } from "next";
import { KrantView } from "@/components/krant/KrantView";

export const metadata: Metadata = { title: "De Beurskrant" };

export default function KrantPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl">
      <KrantView />
    </div>
  );
}
