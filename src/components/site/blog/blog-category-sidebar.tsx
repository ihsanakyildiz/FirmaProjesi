import { SiteLink } from "@/components/site/site-link";
import { BLOG_CATEGORY_PATH, blogCategoryHref } from "@/lib/blog";

export type BlogSidebarCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  postCount: number;
};

export function BlogCategorySidebar({
  categories,
  activeSlug = null,
}: {
  categories: BlogSidebarCategory[];
  activeSlug?: string | null;
}) {
  const roots = categories.filter(
    (category) =>
      !category.parentId ||
      !categories.some((item) => item.id === category.parentId),
  );
  const items = roots.length > 0 ? roots : categories;

  if (categories.length === 0) return null;

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="rounded-3xl border border-site-border bg-site-card p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-site-fg">
          Kategoriler
        </h2>
        <ul className="mt-3 space-y-1">
          <li>
            <SiteLink
              href="/blog"
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                !activeSlug
                  ? "bg-site-primary-soft font-semibold text-site-primary"
                  : "text-site-fg hover:bg-site-surface"
              }`}
            >
              Tüm yazılar
            </SiteLink>
          </li>
          {items.map((category) => (
            <CategoryBranch
              key={category.id}
              category={category}
              categories={categories}
              activeSlug={activeSlug}
              depth={0}
            />
          ))}
        </ul>
        <SiteLink
          href={BLOG_CATEGORY_PATH}
          className="mt-4 inline-flex text-sm font-semibold text-site-primary hover:underline"
        >
          Tüm kategoriler
        </SiteLink>
      </div>
    </aside>
  );
}

function CategoryBranch({
  category,
  categories,
  activeSlug,
  depth,
}: {
  category: BlogSidebarCategory;
  categories: BlogSidebarCategory[];
  activeSlug: string | null;
  depth: number;
}) {
  const children = categories.filter((item) => item.parentId === category.id);
  const active = activeSlug === category.slug;

  return (
    <li>
      <SiteLink
        href={blogCategoryHref(category.slug)}
        className={`flex items-center justify-between rounded-xl py-2.5 pr-3 text-sm transition ${
          depth > 0 ? "pl-6" : "pl-3"
        } ${
          active
            ? "bg-site-primary-soft font-semibold text-site-primary"
            : "text-site-fg hover:bg-site-surface"
        }`}
      >
        <span className="truncate">{category.name}</span>
        <span className="ml-2 shrink-0 text-xs text-site-muted">
          {category.postCount}
        </span>
      </SiteLink>
      {children.length > 0 ? (
        <ul className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <CategoryBranch
              key={child.id}
              category={child}
              categories={categories}
              activeSlug={activeSlug}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
