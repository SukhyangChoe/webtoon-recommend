import { workDetailResponse } from '@/features/match/server/workDetailResponse';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ canonicalWebtoonId: string }> }) {
  return workDetailResponse(request, (await params).canonicalWebtoonId, 'fit');
}
