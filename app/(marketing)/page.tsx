import { Suspense } from "react";
import { Hero } from "@/components/marketing/sections/hero";
import { Disciplines } from "@/components/marketing/sections/disciplines";
import { EventsPreview, EventsPreviewSkeleton } from "@/components/marketing/sections/events-preview";
import { HowItWorks } from "@/components/marketing/sections/how-it-works";
import { AboutPreview, AboutPreviewSkeleton } from "@/components/marketing/sections/about-preview";
import { PalmaresPreview } from "@/components/marketing/sections/palmares-preview";
import { GalleryPreview } from "@/components/marketing/sections/gallery-preview";
import { NewsPreview, NewsPreviewSkeleton } from "@/components/marketing/sections/news-preview";
import { TestimonialsSection } from "@/components/marketing/sections/testimonials-section";
import { TransformationsPreview } from "@/components/marketing/sections/transformations-preview";
import { CtaBanner } from "@/components/marketing/sections/cta";

/**
 * Homepage. Every data-driven section renders real records only and hides
 * itself when there is nothing to show (no invented stats, programs or
 * testimonials).
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Disciplines />
      <Suspense fallback={<EventsPreviewSkeleton />}>
        <EventsPreview />
      </Suspense>
      <HowItWorks />
      <Suspense fallback={<AboutPreviewSkeleton />}>
        <AboutPreview />
      </Suspense>
      <Suspense fallback={null}>
        <PalmaresPreview />
      </Suspense>
      <Suspense fallback={null}>
        <TransformationsPreview />
      </Suspense>
      <Suspense fallback={null}>
        <TestimonialsSection />
      </Suspense>
      <Suspense fallback={<NewsPreviewSkeleton />}>
        <NewsPreview />
      </Suspense>
      <Suspense fallback={null}>
        <GalleryPreview />
      </Suspense>
      <CtaBanner />
    </>
  );
}
