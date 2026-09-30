import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumb } from "@/components/shop/Breadcrumb";
import { ContentPanel } from "@/components/shop/ContentBlocks";
import { ClockIcon, MapPinIcon, PhoneIcon } from "@/components/shop/icons";
import { btnOutline } from "@/components/shop/styles";
import { RichText } from "@/components/ui/RichText";
import {
  formatOpeningHours,
  openingHoursSpecification,
} from "@/lib/branch-hours";
import { breadcrumbJsonLd, localBusinessJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { phoneHref } from "@/lib/site-settings";
import { safeDecode } from "@/lib/utils";
import {
  type BranchDto,
  getBranchPage,
} from "@/server/services/branch.service";
import {
  getSeoContext,
  getSeoSettings,
} from "@/server/services/seo-settings.service";

type Params = Promise<{ slug: string }>;

export const revalidate = 300;
export function generateStaticParams() {
  return [];
}

async function requireBranch(params: Params): Promise<BranchDto> {
  const { slug } = await params;
  const lookup = await getBranchPage(safeDecode(slug));
  if (lookup.kind === "redirect") permanentRedirect(lookup.to);
  if (lookup.kind === "missing") notFound();
  return lookup.data;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const lookup = await getBranchPage(safeDecode(slug));
  if (lookup.kind !== "found") return {};
  const branch = lookup.data;
  const city = branch.city ? ` ${branch.city}` : "";
  return buildPageMetadata(await getSeoContext(), {
    title: branch.seoTitle || `${branch.name}${city}`,
    description:
      branch.metaDescription ||
      `آدرس، تلفن و ساعات کاری ${branch.name}: ${branch.address}`,
    path: `/branches/${branch.slug}`,
  });
}

/** لینک مسیریابی به نقشه‌ها (بدون embed سنگین نقشه‌ی خارجی) */
function MapLinks({ branch }: { branch: BranchDto }) {
  const links = [
    { label: "مسیریابی با نشان", href: branch.mapLinks.neshan },
    { label: "مسیریابی با بلد", href: branch.mapLinks.balad },
    { label: "گوگل‌مپ", href: branch.mapLinks.google },
  ].filter((item): item is { label: string; href: string } => !!item.href);
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {links.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={btnOutline}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

export default async function BranchPage({ params }: { params: Params }) {
  const branch = await requireBranch(params);
  const [context, seo] = await Promise.all([getSeoContext(), getSeoSettings()]);
  const crumbs = [
    { name: "خانه", path: "/" },
    { name: "شعب", path: "/branches" },
    { name: branch.name, path: `/branches/${branch.slug}` },
  ];
  const hours = formatOpeningHours(branch.openingHours);

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-8 px-5 pt-6 md:pt-8">
      <JsonLd
        data={[
          localBusinessJsonLd({
            siteUrl: context.siteUrl,
            brandName: seo.brandName,
            name: branch.name,
            slug: branch.slug,
            city: branch.city,
            district: branch.district,
            address: branch.address,
            phone: branch.phone,
            latitude: branch.latitude,
            longitude: branch.longitude,
            image: branch.imageUrl,
            mapUrl:
              branch.mapLinks.neshan ??
              branch.mapLinks.balad ??
              branch.mapLinks.google,
            openingHours: openingHoursSpecification(branch.openingHours),
          }),
          breadcrumbJsonLd(crumbs, context.siteUrl),
        ]}
      />
      <Breadcrumb
        items={crumbs.map((crumb, index) => ({
          label: crumb.name,
          href: index < crumbs.length - 1 ? crumb.path : undefined,
        }))}
      />
      <h1 className="text-[28px] font-extrabold md:text-4xl">{branch.name}</h1>

      <ContentPanel className="flex flex-col gap-4">
        <p className="flex items-start gap-2 text-[15px] leading-[2]">
          <MapPinIcon size={17} className="text-accent mt-1.5 shrink-0" />
          {[branch.city, branch.district, branch.address]
            .filter(Boolean)
            .join("، ")}
        </p>
        <p className="flex items-center gap-2 text-[15px]">
          <PhoneIcon size={17} className="text-accent shrink-0" />
          <a
            href={phoneHref(branch.phone)}
            dir="ltr"
            className="hover:text-brand-strong"
          >
            {branch.phone}
          </a>
        </p>
        {hours.length > 0 ? (
          <div className="flex items-start gap-2 text-[15px]">
            <ClockIcon size={17} className="text-brand-strong mt-1 shrink-0" />
            <ul className="flex flex-col gap-1">
              {hours.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <MapLinks branch={branch} />
      </ContentPanel>

      {branch.description ? (
        <section className="text-ink-soft text-[15px]">
          <RichText text={branch.description} headingLevel={2} />
        </section>
      ) : null}
    </div>
  );
}
