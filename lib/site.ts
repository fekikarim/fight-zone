export const siteConfig = {
  name: "Fight Zone",
  tagline: "Train. Fight. Win.",
  description:
    "Fight Zone — professional boxing, kickboxing and fitness coaching with Coach Seif Dridi.",
  url: "https://fightzone.example.com",
  coach: {
    name: "Seif Dridi",
    role: "Head Coach & Founder",
  },
  contactEmail: "contact@fightzone.example.com",
  social: {
    instagram: "#",
    facebook: "#",
    youtube: "#",
  },
  nav: {
    public: [
      { href: "/", label: "Home" },
      { href: "/about", label: "About" },
      { href: "/services", label: "Services" },
      { href: "/events", label: "Events" },
      { href: "/pricing", label: "Pricing" },
      { href: "/news", label: "News" },
      { href: "/contact", label: "Contact" },
    ],
  },
} as const;

export type PublicNavLink = (typeof siteConfig.nav.public)[number];
