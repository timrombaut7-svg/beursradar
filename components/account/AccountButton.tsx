"use client";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { useAccount } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/** Knop in de kopbalk: je beginletter als je bent ingelogd, anders een poppetje. */
export function AccountButton({ active }: { active: boolean }) {
  const { data } = useAccount();
  const user = data?.user;
  if (data && !data.enabled) return null; // zonder database bestaan er geen accounts
  return (
    <Link
      href="/account"
      aria-label={user ? `Account: ${user.username}` : "Inloggen of account maken"}
      className={cn("rounded-xl p-1.5 text-muted hover:bg-panel-2 hover:text-text", active && "bg-panel-2 text-text")}
    >
      {user ? (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-bull to-accent text-xs font-bold uppercase text-black">
          {user.username.charAt(0)}
        </span>
      ) : (
        <span className="grid h-6 w-6 place-items-center">
          <UserRound className="h-4 w-4" />
        </span>
      )}
    </Link>
  );
}
