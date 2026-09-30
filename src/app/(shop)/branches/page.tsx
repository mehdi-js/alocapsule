import type { Metadata } from "next";

import { BranchCards, PageHero } from "@/components/shop/ContentBlocks";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SITE } from "@/lib/site-content";
import { getBanners } from "@/server/services/banner.service";
import { getSeoContext } from "@/server/services/seo-settings.service";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSeoContext(), {
    title: "آدرس شعب",
    description: `آدرس، شماره تماس و ساعات کاری شعب ${SITE.name}.`,
    path: "/branches",
  });
}

export default async function BranchesPage() {
  const banners = await getBanners();
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-5 pt-4 md:pt-5">
      <PageHero
        eyebrow="به ما سر بزنید"
        title={[`شعب ${SITE.name}`]}
        imageLabel="نمای شعبه"
        images={banners.images.branchesHero}
      >
        <p className="text-ink-2 text-[15px] leading-[2]">
          برای تحویل حضوری سفارش، به یکی از این نشانی‌ها مراجعه کنید.
        </p>
      </PageHero>
      <BranchCards />
    </div>
  );
}
