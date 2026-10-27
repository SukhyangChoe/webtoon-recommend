import type { CSSProperties } from "react";
import { PersonaAvatar } from "./PersonaAvatar";

export type RelationshipPerson = {
  entryId: string; resultId: string; nickname: string; score: number; rank: number | null;
  sharedGenres: string[]; genreKey: string | null; isViewer: boolean; isReciprocal: boolean; updatedAt: string;
};

const positions = [{ x: 22, y: 13 }, { x: 78, y: 13 }, { x: 15, y: 45 }, { x: 85, y: 45 }, { x: 29, y: 78 }, { x: 71, y: 78 }];

export function RelationshipMap({ ownerNickname, ownerGenreKey, entries, selectedId, onSelect }: {
  ownerNickname: string; ownerGenreKey: string | null; entries: RelationshipPerson[]; selectedId?: string;
  onSelect: (entry: RelationshipPerson) => void;
}) {
  return <div className={`wm-relationship-map${entries.length ? "" : " is-empty"}`} aria-label={`${ownerNickname}님과 궁합이 잘 맞는 참여자 관계도`}>
    <svg className="wm-relationship-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {entries.map((entry, index) => {
        const point = positions[index];
        if (!point) return null;
        return <path key={entry.entryId} className={selectedId === entry.entryId ? "is-selected" : ""} d={`M50 45 C${point.x} 45, 50 ${point.y}, ${point.x} ${point.y}`} />;
      })}
    </svg>
    <div className="wm-relationship-owner" style={{ "--node-x": "50%", "--node-y": "45%" } as CSSProperties}>
      <PersonaAvatar genreKey={ownerGenreKey} priority /><strong title={ownerNickname}>{ownerNickname}</strong><span>주인장</span>
    </div>
    {entries.map((entry, index) => {
      const position = positions[index];
      if (!position) return null;
      return <button key={entry.entryId} type="button" className={`wm-relationship-node${selectedId === entry.entryId ? " is-selected" : ""}${entry.isViewer ? " is-viewer" : ""}`} style={{ "--node-x": `${position.x}%`, "--node-y": `${position.y}%` } as CSSProperties} onClick={() => onSelect(entry)} aria-label={`${entry.nickname}님과의 궁합 ${entry.score}%, 요약 보기`}>
        <PersonaAvatar genreKey={entry.genreKey} priority /><span><strong title={entry.nickname}>{entry.nickname}{entry.isViewer ? " (나)" : ""}</strong><b>{entry.score}%</b></span>
      </button>;
    })}
  </div>;
}
