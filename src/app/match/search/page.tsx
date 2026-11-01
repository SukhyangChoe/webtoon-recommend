import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WorkSearchView } from '@/features/match/components/WorkSearchView';

export const metadata: Metadata = { title: '작품 검색 · 웹툰핏', robots: { index: false, follow: false } };

export default function WorkSearchPage() {
  return <Suspense fallback={<main className="match-page wm-screen"><p role="status">작품 검색을 준비하는 중…</p></main>}><WorkSearchView /></Suspense>;
}
