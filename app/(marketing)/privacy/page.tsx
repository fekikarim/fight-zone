import type { Metadata } from "next";
import { LegalPage } from "@/components/site-content/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const version = v && /^\d{1,4}$/.test(v) ? Number(v) : undefined;
  return <LegalPage kind="privacy" version={version} />;
}
