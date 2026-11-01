import type { Metadata } from 'next';
import { WorkDetailView } from '@/features/match/components/WorkDetailView';

export const metadata: Metadata = { title: '작품 상세 · 웹툰핏', robots: { index: false, follow: false } };

export default async function WorkDetailPage({ params, searchParams }: {
  params: Promise<{ canonicalWebtoonId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { canonicalWebtoonId } = await params;
  const query = await searchParams;
  return <WorkDetailView key={canonicalWebtoonId} id={canonicalWebtoonId} returnTo={typeof query.returnTo === 'string' ? query.returnTo : undefined} />;
}
