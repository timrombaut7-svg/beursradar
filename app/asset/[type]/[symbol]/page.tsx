import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssetView } from "@/components/asset/AssetView";

type Params = Promise<{ type: string; symbol: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { symbol } = await params;
  return { title: `${decodeURIComponent(symbol).toUpperCase()} analyse` };
}

export default async function AssetPage({ params }: { params: Params }) {
  const { type, symbol } = await params;
  if (type !== "stock" && type !== "crypto") notFound();
  return <AssetView type={type} symbol={decodeURIComponent(symbol).toUpperCase()} />;
}
