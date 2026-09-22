import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/page-hero";
import { EventDetailDisplay } from "@/components/events/event-detail";
import { getPublicEventById } from "@/lib/supabase/queries";
import { getCurrentUser } from "@/lib/auth/guards";
import { resolveEventImage } from "@/lib/events/images";
import { getEventHref } from "@/lib/types/events";
import { siteConfig } from "@/lib/site";

interface Props {
  params: Promise<{ id: string }>;
}

/** Postgres rejects non-UUID ids with 22P02; treat malformed ids as missing. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Event not found" };
  const event = await getPublicEventById(id);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.description?.slice(0, 160) ?? `Event at Fight Zone — ${event.title}`,
  };
}

export default async function PublicEventDetailPage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const event = await getPublicEventById(id);
  if (!event) notFound();

  const user = await getCurrentUser();
  const image = resolveEventImage({
    image_url: event.image_url,
    event_type: event.event_type,
    is_private_coaching: event.is_private_coaching,
  });

  return (
    <>
      <PageHero
        eyebrow="Event"
        title={event.title}
        description={event.description?.slice(0, 120) ?? ""}
        image={image}
      />

      <section className="py-16 lg:py-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            <EventDetailDisplay
              event={event}
              action={
                <Button asChild size="lg" className="gap-2">
                  <Link href={user ? getEventHref("member", event.id) : "/sign-in"}>
                    {user ? "Register for this event" : "Log in to register"}
                  </Link>
                </Button>
              }
            />

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-ink-border bg-ink-soft/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Price
                </p>
                <p className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">
                  {event.is_free ? "Free" : `${event.price_tnd ?? 0} TND`}
                </p>
                <p className="mt-1 text-sm text-muted">Paid locally — pay at the desk.</p>
              </div>
              <div className="rounded-xl border border-ink-border bg-ink-soft/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Hosted by
                </p>
                <p className="mt-2 font-display text-lg font-bold uppercase tracking-tight">
                  {siteConfig.coach.name}
                </p>
                <p className="mt-1 text-sm text-muted">{siteConfig.coach.role}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-ink-border bg-ink-soft/40 p-5 text-sm leading-relaxed text-muted">
              <p className="font-display text-base font-semibold uppercase tracking-tight text-foreground">
                Registration & payment
              </p>
              <p className="mt-2">
                Signing up is free and takes a minute.{" "}
                {event.is_free
                  ? "This event is free — just show up at the gym."
                  : `The ${event.price_tnd ?? 0} TND fee is paid locally at the gym desk — there is no online payment.`}
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}