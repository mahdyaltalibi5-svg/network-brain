import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import { CtaBand } from "@/components/ui/CtaBand";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { Related } from "@/components/ui/Related";
import { rich } from "@/components/ui/Rich";
import { founder } from "@/content/business";
import BespokeVsMtm from "@/content/journal/bodies/bespoke-vs-mtm";
import ExecutiveCapsule from "@/content/journal/bodies/executive-capsule";
import WeddingTimeline from "@/content/journal/bodies/wedding-timeline";
import { getPost, posts } from "@/content/journal/posts";
import { article, breadcrumbs, graph } from "@/lib/seo/jsonld";
import { pageMeta } from "@/lib/seo/metadata";

const bodies: Record<string, ComponentType> = {
  "bespoke-vs-made-to-measure-vs-off-the-rack": BespokeVsMtm,
  "custom-wedding-suit-timeline": WeddingTimeline,
  "executive-capsule-wardrobe": ExecutiveCapsule,
};

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return pageMeta({
    title: `${post.seoTitle} | Summit Customs`,
    description: post.description,
    path: `/journal/${post.slug}`,
    type: "article",
    publishedTime: post.published,
    modifiedTime: post.modified,
  });
}

const fmt = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export default async function JournalPost({ params }: PageProps<"/journal/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  const Body = bodies[slug];
  if (!post || !Body) notFound();

  const trail = [
    { name: "Journal", path: "/journal" },
    { name: post.title, path: `/journal/${post.slug}` },
  ];
  const others = posts.filter((p) => p.slug !== post.slug);

  return (
    <>
      <article aria-labelledby="page-title">
        <PageHero eyebrow={post.section} title={post.title} trail={trail} compact>
          <p className="mt-10 text-sm text-ivory-dim">
            By {rich(founder.name)}, {founder.role} · <time dateTime={post.published}>{fmt(post.published)}</time>
            {post.modified !== post.published && (
              <>
                {" "}· Updated <time dateTime={post.modified}>{fmt(post.modified)}</time>
              </>
            )}{" "}
            · {post.readingMinutes} min read
          </p>
        </PageHero>

        <div className="container-site grid gap-14 pb-24 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <nav aria-label="In this article">
                <p className="eyebrow">In this article</p>
                <ol className="mt-5 space-y-2 text-sm text-ivory-dim">
                  {post.toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className="hover:text-gold-bright">
                        {t.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </aside>
          <div className="lg:col-span-8 lg:col-start-5">
            <section aria-labelledby="takeaways-title" className="mb-14 border border-line p-7 md:p-9">
              <h2 id="takeaways-title" className="eyebrow !font-sans !text-[0.72rem] !leading-normal">
                Key takeaways
              </h2>
              <ul className="mt-5 space-y-3 text-ivory">
                {post.takeaways.map((t) => (
                  <li key={t} className="flex gap-4">
                    <span aria-hidden="true" className="mt-3 h-px w-4 shrink-0 bg-gold" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>
            <div data-article-body className="prose-site text-[1.08rem]">
              <Body />
            </div>
          </div>
        </div>
      </article>

      <Related
        title="More from the journal"
        items={others.map((p) => ({ href: `/journal/${p.slug}`, label: p.title, description: p.description }))}
      />
      <CtaBand />
      <JsonLd data={graph(article(post), breadcrumbs(trail))} />
    </>
  );
}
