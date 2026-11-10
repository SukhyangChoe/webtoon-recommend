import type { ReactNode } from 'react';
import { WorkCover, type RecommendationWorkItem } from './RecommendationWork';
import { MatchIcon } from './MatchIcon';
import { recommendationGenreLabel } from '../config/recommendationPresentation.mjs';

export function WorkSearchResultContent({ item, selected = false, action = 'detail' }: {
  item: RecommendationWorkItem & { platform?: string }; selected?: boolean; action?: 'add' | 'edit' | 'detail';
}) {
  return <><WorkCover item={item} decorative sizes="48px" /><span className="wm-library-result-copy wm-catalog-copy"><strong>{item.title}</strong><span className="wm-library-result-genre">{recommendationGenreLabel(item.mainGenre)}{item.platform ? ` · ${item.platform}` : ''}{selected ? ' · 담긴 작품' : ''}</span>{item.introduction ? <span className="wm-library-result-description">{item.introduction}</span> : null}</span><span className="wm-library-result-action" aria-hidden="true"><MatchIcon name={action === 'detail' ? 'chevron' : action === 'add' ? 'plus' : 'edit'} /></span></>;
}

export function WorkSearchDropdown({ id, titleId, loading, count, onClose, children }: {
  id: string; titleId: string; loading: boolean; count?: number; onClose: () => void; children: ReactNode;
}) {
  return <section id={id} className="wm-search-dropdown" role="dialog" aria-modal="false" aria-labelledby={titleId} aria-busy={loading}>
    <header className="wm-search-dropdown-heading"><h3 id={titleId}>{loading ? '작품을 찾고 있어요' : '검색 결과'}{count !== undefined ? <small>{count}편</small> : null}</h3><button type="button" aria-label="검색 결과 닫기" onClick={onClose}><MatchIcon name="close" /></button></header>
    <div className="wm-search-dropdown-scroll">{children}</div>
  </section>;
}
