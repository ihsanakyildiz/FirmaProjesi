import Image from "next/image";
import Link from "next/link";
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
  type LucideIcon,
} from "lucide-react";
import { LucideIconByName } from "@/lib/lucide-icons";
import { stripHtml } from "@/lib/html";

export type WorkDetailSkill = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
};

export type WorkDetailRelatedProject = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
};

type WorkDetailViewProps = {
  title: string;
  summary?: string | null;
  content?: string | null;
  image?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  phone?: string;
  email?: string;
  address?: string;
  social?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  skills: WorkDetailSkill[];
  relatedProjects: WorkDetailRelatedProject[];
};

function SocialLink({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-site-border bg-site-card text-site-muted transition hover:border-site-primary/40 hover:text-site-primary"
    >
      <Icon className="h-4 w-4" />
    </a>
  );
}

export function WorkDetailView({
  title,
  summary,
  content,
  image,
  categoryName,
  phone,
  email,
  address,
  social,
  skills,
  relatedProjects,
}: WorkDetailViewProps) {
  const summaryText = stripHtml(summary);
  const hasContact = Boolean(phone || email || address);
  const socialLinks = [
    social?.facebook
      ? { href: social.facebook, label: "Facebook", Icon: Facebook }
      : null,
    social?.twitter
      ? { href: social.twitter, label: "X / Twitter", Icon: Twitter }
      : null,
    social?.instagram
      ? { href: social.instagram, label: "Instagram", Icon: Instagram }
      : null,
    social?.linkedin
      ? { href: social.linkedin, label: "LinkedIn", Icon: Linkedin }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string; Icon: LucideIcon }>;

  return (
    <>
      <section className="relative overflow-hidden border-b border-site-border bg-site-surface py-12 sm:py-14">
        <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
            {title}
          </h1>
          <nav className="mt-3 text-sm text-site-primary">
            <Link href="/" className="hover:underline">
              Ana Sayfa
            </Link>
            <span className="mx-2 text-site-muted">›</span>
            <Link href="/yapilan-isler" className="hover:underline">
              Yapılan İşler
            </Link>
            <span className="mx-2 text-site-muted">›</span>
            <span className="text-site-muted">{title}</span>
          </nav>
        </div>
      </section>

      <section className="relative bg-[#f6f7fb] py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <article className="overflow-hidden rounded-[1.75rem] border border-site-border bg-white shadow-[0_20px_60px_-28px_rgba(15,23,42,0.35)]">
            <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="relative min-h-[18rem] bg-slate-100 sm:min-h-[22rem] lg:min-h-full">
                <Image
                  src={
                    image ||
                    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
                  }
                  alt={title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 48vw"
                />
              </div>

              <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                <h2 className="font-display text-2xl font-bold tracking-tight text-site-fg sm:text-3xl">
                  {title}
                </h2>
                {categoryName ? (
                  <p className="mt-1 text-sm font-medium text-site-muted">
                    {categoryName}
                  </p>
                ) : null}
                {summaryText ? (
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-site-muted sm:text-[15px]">
                    {summaryText}
                  </p>
                ) : null}

                {hasContact ? (
                  <ul className="mt-6 space-y-3 text-sm text-site-fg">
                    {phone ? (
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-site-primary-soft text-site-primary">
                          <Phone className="h-4 w-4" />
                        </span>
                        <a
                          href={`tel:${phone.replace(/\s+/g, "")}`}
                          className="pt-1.5 hover:text-site-primary"
                        >
                          {phone}
                        </a>
                      </li>
                    ) : null}
                    {email ? (
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-site-primary-soft text-site-primary">
                          <Mail className="h-4 w-4" />
                        </span>
                        <a
                          href={`mailto:${email}`}
                          className="pt-1.5 break-all hover:text-site-primary"
                        >
                          {email}
                        </a>
                      </li>
                    ) : null}
                    {address ? (
                      <li className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-site-primary-soft text-site-primary">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <span className="pt-1.5 leading-relaxed text-site-muted">
                          {address}
                        </span>
                      </li>
                    ) : null}
                  </ul>
                ) : null}

                {socialLinks.length > 0 ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {socialLinks.map((item) => (
                      <SocialLink key={item.href} {...item} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14 lg:px-8">
          <div>
            {content?.trim() ? (
              <div
                className="site-rich-content"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : summaryText ? (
              <p className="text-base leading-relaxed text-site-muted">
                {summaryText}
              </p>
            ) : (
              <p className="text-sm text-site-muted">
                Bu çalışma için detaylı içerik yakında eklenecek.
              </p>
            )}

            {relatedProjects.length > 0 ? (
              <div className="mt-10 border-t border-site-border pt-8">
                <h3 className="font-display text-xl font-bold text-site-fg">
                  İlgili Projeler
                </h3>
                <ul className="mt-4 space-y-4">
                  {relatedProjects.map((project) => (
                    <li key={project.id}>
                      <Link
                        href={`/projeler/${project.slug}`}
                        className="group block rounded-2xl border border-site-border bg-site-card p-4 transition hover:border-site-primary/35 hover:shadow-md"
                      >
                        <span className="font-semibold text-site-fg group-hover:text-site-primary">
                          {project.title}
                        </span>
                        {project.summary ? (
                          <span className="mt-1 block text-sm text-site-muted line-clamp-2">
                            {stripHtml(project.summary)}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <aside>
            <div className="rounded-[1.5rem] border border-site-border bg-[#f8f7fc] p-6 sm:p-7">
              <h3 className="font-display text-xl font-bold text-site-fg">
                Yetenekler & Deneyim
              </h3>
              {skills.length > 0 ? (
                <ul className="mt-6 space-y-5">
                  {skills.map((skill) => (
                    <li key={skill.id} className="flex gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-site-primary-soft text-site-primary">
                        {skill.icon ? (
                          <LucideIconByName
                            name={skill.icon}
                            className="h-5 w-5"
                          />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-site-primary" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-site-fg">
                          {skill.name}
                        </span>
                        {skill.description ? (
                          <span className="mt-1 block text-sm leading-relaxed text-site-muted">
                            {stripHtml(skill.description)}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-site-muted">
                  Bu çalışmaya bağlı özellik veya proje henüz tanımlanmamış.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
