import Image from "next/image";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { getPublicMedia } from "@/lib/supabase/queries";

export async function GalleryPreview() {
  const media = await getPublicMedia(6);

  return (
    <section className="border-y border-ink-border bg-ink-soft/30 py-20 lg:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Gallery"
            title="Inside the Fight Zone"
            description="Training, sweat and victories — a look inside the gym."
            align="center"
            className="mx-auto mb-12 max-w-2xl"
          />
        </Reveal>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
          {media.map((item, i) => (
            <Reveal key={item.id} delay={(i % 3) * 80}>
              <figure
                className={`group relative overflow-hidden rounded-xl border border-ink-border bg-ink-softer ${
                  i === 0 || i === 3 ? "aspect-square" : "aspect-[4/5]"
                }`}
              >
                {item.url ? (
                  <Image
                    src={item.url}
                    alt={item.title ?? "Fight Zone gallery"}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <PlaceholderImage label="Gallery image" className="h-full rounded-none border-0" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {item.title ? (
                  <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-sm font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    {item.title}
                  </figcaption>
                ) : null}
              </figure>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function GalleryPreviewSkeleton() {
  return (
    <section className="border-y border-ink-border bg-ink-soft/30 py-20 lg:py-28">
      <Container>
        <div className="mx-auto mb-12 h-12 w-1/2 skeleton rounded" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className={`aspect-square rounded-xl ${i === 3 ? "hidden md:block" : ""}`} />
          ))}
        </div>
      </Container>
    </section>
  );
}
