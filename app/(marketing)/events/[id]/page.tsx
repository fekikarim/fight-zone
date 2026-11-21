import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { EventDetailDisplay } from "@/components/events/event-detail";
import { getPublicEventById } from "@/lib/supabase/queries";
import { getCurrentUser } from "@/lib/auth/guards";
import { isRemoteImage, resolveEventImage } from "@/lib/events/images";
import { getEventHref } from "@/lib/types/events";
import { EventParticipantsRealtime } from "@/components/events/event-participants-realtime";
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
  const isStaff = user?.roles.some((role) => role === "ADMIN" || role === "COACH") ?? false;
  const image = resolveEventImage({
    image_url: event.image_url,
    event_type: event.event_type,
    is_private_coaching: event.is_private_coaching,
  });

  return (
    <>
      {/* Banner: event artwork in the duotone treatment behind the title. */}
      <section className="relative isolate overflow-hidden border-b border-ink-border">
        <div className="duotone absolute inset-0 -z-10">
          <Image src={image} alt="" fill priority sizes="100vw" unoptimized={isRemoteImage(image)} className="object-cover" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/80 to-background/40" aria-hidden />
        <Container className="flex min-h-[15rem] items-end pb-6 pt-28 sm:min-h-[18rem]">
          <Link href="/events" className="group inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
            All events
          </Link>
        </Container>
      </section>

      <section className="pb-20 pt-10 lg:pb-28">
        <Container>
          {user ? <EventParticipantsRealtime eventId={id} /> : null}
          <EventDetailDisplay
            event={event}
            action={
              isStaff ? (
                <Button asChild size="lg" className="w-full">
                  <Link href={`/admin/events/${event.id}`}>Manage this event</Link>
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button asChild size="lg" className="w-full">
                    <Link href={user ? getEventHref("member", event.id) : `/sign-in?next=${encodeURIComponent(getEventHref("member", event.id))}`}>
                      {user ? "Register for this event" : "Sign in to register"}
                    </Link>
                  </Button>
                  {!user ? (
                    <p className="text-center text-xs text-muted">
                      New here?{" "}
                      <Link href={`/sign-up?next=${encodeURIComponent(getEventHref("member", event.id))}`} className="link-draw font-semibold text-foreground">
                        Create a free account
                      </Link>
                    </p>
                  ) : null}
                </div>
              )
            }
            asideExtra={
              <div className="flex items-center gap-4 rounded-lg border border-ink-border px-5 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-primary font-display text-sm font-bold text-white [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)]">
                  SD
                </span>
                <div>
                  <p className="type-overline text-[10px] text-muted-foreground">Hosted by</p>
                  <p className="font-display text-lg font-semibold uppercase leading-tight">{siteConfig.coach.name}</p>
                </div>
              </div>
            }
          />
        </Container>
      </section>
    </>
  );
}
