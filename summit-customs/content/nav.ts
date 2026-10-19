export type NavItem = { href: string; label: string; description?: string };

export const primaryNav: NavItem[] = [
  { href: "/bespoke-suits", label: "Bespoke Suits" },
  { href: "/custom-wedding-suits-salt-lake-city", label: "Wedding" },
  { href: "/image-consulting", label: "Image Consulting" },
  { href: "/executive-wardrobe", label: "Executive Wardrobe" },
  { href: "/fabrics", label: "Fabrics" },
  { href: "/process", label: "Process" },
  { href: "/journal", label: "Journal" },
];

export const secondaryNav: NavItem[] = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/book", label: "Book a Private Fitting" },
];

export const servicesNav: NavItem[] = [
  {
    href: "/bespoke-suits",
    label: "Bespoke Suits",
    description: "Cut from your own pattern, built over multiple fittings.",
  },
  {
    href: "/custom-wedding-suits-salt-lake-city",
    label: "Custom Wedding Suits",
    description: "For grooms and wedding parties across Utah.",
  },
  {
    href: "/image-consulting",
    label: "Image Consulting",
    description: "Colour, proportion and presence, planned with intent.",
  },
  {
    href: "/executive-wardrobe",
    label: "Executive Wardrobe",
    description: "A complete, rotating wardrobe for leaders who travel and present.",
  },
];
