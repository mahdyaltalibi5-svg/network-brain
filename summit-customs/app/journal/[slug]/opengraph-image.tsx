import { ogContentType, ogImage, ogSize } from "@/lib/og";
import { getPost, posts } from "@/content/journal/posts";

export const alt = "Summit Customs Journal";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  return ogImage({ title: post?.title ?? "The Journal", eyebrow: `Journal · ${post?.section ?? ""}` });
}
