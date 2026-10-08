import { llmsFullTxt } from "@/lib/seo/llms";
import { QUESTIONS } from "@/app/(HOME)/_components/Faq";
import { HOME_QUESTIONS } from "@/app/(HOME)/_components/WhatIsLivery";

export const revalidate = 3600;

export async function GET() {
  return new Response(await llmsFullTxt([...HOME_QUESTIONS, ...QUESTIONS]), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
