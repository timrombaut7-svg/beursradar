import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AccountView } from "@/components/account/AccountView";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader
        icon={<UserRound className="h-5 w-5" />}
        title="Account"
        subtitle="Met een account staan je portfolio en watchlist veilig opgeslagen en zie je ze op elk toestel terug."
      />
      <AccountView />
    </div>
  );
}
