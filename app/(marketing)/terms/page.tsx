import type { Metadata } from "next";
import { LegalPage } from "@/components/site-content/legal-page";

export const metadata: Metadata = { title: "Terms of Use", alternates: { canonical: "/terms" } };

export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const version = v && /^\d{1,4}$/.test(v) ? Number(v) : undefined;
  return <LegalPage kind="terms" version={version} />;
}
