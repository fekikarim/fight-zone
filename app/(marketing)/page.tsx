import { Suspense } from "react";
import { Hero } from "@/components/marketing/sections/hero";
import {
  StatsStrip,
  StatsStripSkeleton,
} from "@/components/marketing/sections/stats";
import {
  AboutPreview,
  AboutPreviewSkeleton,
} from "@/components/marketing/sections/about-preview";
import {
  ServicesPreview,
  ServicesPreviewSkeleton,
} from "@/components/marketing/sections/services-preview";
import {
  PricingPreview,
  PricingPreviewSkeleton,
} from "@/components/marketing/sections/pricing-preview";
import {
  PalmaresPreview,
  PalmaresPreviewSkeleton,
} from "@/components/marketing/sections/palmares-preview";
import {
  GalleryPreview,
  GalleryPreviewSkeleton,
} from "@/components/marketing/sections/gallery-preview";
import {
  EventsPreview,
  EventsPreviewSkeleton,
} from "@/components/marketing/sections/events-preview";
import {
  NewsPreview,
  NewsPreviewSkeleton,
} from "@/components/marketing/sections/news-preview";
import {
  TestimonialsSection,
  TestimonialsSectionSkeleton,
} from "@/components/marketing/sections/testimonials-section";
import {
  TransformationsPreview,
  TransformationsPreviewSkeleton,
} from "@/components/marketing/sections/transformations-preview";
import { CtaBanner } from "@/components/marketing/sections/cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<StatsStripSkeleton />}>
        <StatsStrip />
      </Suspense>
      <Suspense fallback={<AboutPreviewSkeleton />}>
        <AboutPreview />
      </Suspense>
      <Suspense fallback={<ServicesPreviewSkeleton />}>
        <ServicesPreview />
      </Suspense>
      <Suspense fallback={<PricingPreviewSkeleton />}>
        <PricingPreview />
      </Suspense>
      <Suspense fallback={<PalmaresPreviewSkeleton />}>
        <PalmaresPreview />
      </Suspense>
      <Suspense fallback={<GalleryPreviewSkeleton />}>
        <GalleryPreview />
      </Suspense>
      <Suspense fallback={<EventsPreviewSkeleton />}>
        <EventsPreview />
      </Suspense>
      <Suspense fallback={<NewsPreviewSkeleton />}>
        <NewsPreview />
      </Suspense>
      <Suspense fallback={<TestimonialsSectionSkeleton />}>
        <TestimonialsSection />
      </Suspense>
      <Suspense fallback={<TransformationsPreviewSkeleton />}>
        <TransformationsPreview />
      </Suspense>
      <CtaBanner />
    </>
  );
}
