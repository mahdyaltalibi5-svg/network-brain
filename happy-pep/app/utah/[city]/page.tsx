import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopLanding } from "@/components/shop-landing";
import { cities, getCity } from "@/lib/cities";

export function generateStaticParams() {
  return cities.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/utah/[city]">): Promise<Metadata> {
  const city = getCity((await params).city);
  if (!city) return {};
  return {
    title: `Same-Day Research Peptides in ${city.name}, UT · Happy Pep`,
    description: `Order before noon for same-day delivery in ${city.name} and across ${city.county}. Third-party tested, COA on every lot, free BAC water with every order.`,
    alternates: { canonical: `/utah/${city.slug}` },
  };
}

export default async function CityPage({ params }: PageProps<"/utah/[city]">) {
  const city = getCity((await params).city);
  if (!city) notFound();
  return <ShopLanding city={city.name} />;
}
