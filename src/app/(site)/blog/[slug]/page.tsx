import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { BlogPostDetailView } from "@/components/site/blog/blog-post-detail";
import { getCachedBlogDetailPayload, getCachedBlogSlugs } from "@/lib/blog";
import { prepareRichHtml, stripHtml } from "@/lib/html";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { getSettingsMap } from "@/lib/settings";

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

export const revalidate = 60;

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const rows = await getCachedBlogSlugs().catch(() => []);
  return rows.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getCachedBlogDetailPayload(slug).catch(() => null);
  if (!payload) return { title: "Blog" };

  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(payload.post.image, perf.cdnUrl);
  const description =
    payload.post.seoDescription || stripHtml(payload.post.summary) || undefined;

  return {
    title: payload.post.seoTitle || payload.post.title,
    description,
    openGraph: {
      title: payload.post.seoTitle || payload.post.title,
      description,
      type: "article",
      images: cover ? [{ url: cover }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  const [payload, settings] = await Promise.all([
    getCachedBlogDetailPayload(slug).catch(() => null),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);

  if (!payload) notFound();

  const { post, relatedPosts, categories } = payload;
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(post.image, perf.cdnUrl);

  if (cover) {
    preload(cover, { as: "image", fetchPriority: "high" });
  }

  const content = prepareRichHtml(post.content, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });

  return (
    <>
      <BlogPostDetailView
        title={post.title}
        summary={post.summary}
        content={content}
        image={cover}
        categoryName={post.category?.name ?? null}
        categorySlug={post.category?.slug ?? null}
        publishedAt={new Date(post.updatedAt)}
        relatedPosts={relatedPosts.map((item) => ({
          ...item,
          image: withCdnUrl(item.image, perf.cdnUrl),
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          postCount: category._count.posts,
        }))}
        phone={settings.contact_phone || ""}
      />
      <HomeCta />
    </>
  );
}
