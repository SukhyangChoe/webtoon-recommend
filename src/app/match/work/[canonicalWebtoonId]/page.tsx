import type { Metadata } from 'next';
import { WorkDetailView } from '@/features/match/components/WorkDetailView';

export const metadata: Metadata = { title: '작품 상세 · 웹툰핏', robots: { index: false, follow: false } };

export default async function WorkDetailPage({ params, searchParams }: {
  params: Promise<{ canonicalWebtoonId: string }>;
  searchParams: Promise<{ profile?: string; returnTo?: string }>;
}) {
  const { canonicalWebtoonId } = await params;
  const query = await searchParams;
  return <WorkDetailView key={`${canonicalWebtoonId}:${query.profile ?? ''}`} id={canonicalWebtoonId} profileId={typeof query.profile === 'string' ? query.profile : undefined} returnTo={typeof query.returnTo === 'string' ? query.returnTo : undefined} />;
}
