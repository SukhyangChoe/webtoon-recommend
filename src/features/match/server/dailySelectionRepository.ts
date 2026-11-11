import 'server-only';
import { randomUUID } from 'node:crypto';
import { getMatchDatabase } from './database';

type Selection = { items: Array<{ canonicalWebtoonId: string; title: string; platform: string; matchReason?: { version: number; summary: string; labels: string[]; referenceWork?: {canonicalWebtoonId:string;title:string;labels:string[]} } }> };

export function dailySelectionRepository(database = getMatchDatabase()) {
  return {
    async updateExplanations(profileId:string,key:string,selection:Selection){
      await database`update public.match_daily_selections set selected_items=${database.json(selection.items)}
        where profile_id=${profileId}::uuid and request_key=${key} and expires_at>clock_timestamp() and selected_items is not null`;
    },
    async read(profileId: string, key: string): Promise<Selection | null> {
      const [row] = await database<{ selected_items: Selection['items'] }[]>`
        select selected_items from public.match_daily_selections
        where profile_id=${profileId}::uuid and request_key=${key}
          and expires_at>clock_timestamp() and selected_items is not null
      `;
      return row ? { items: row.selected_items } : null;
    },
    async claim(profileId: string, key: string, expiresAt: string) {
      const token = randomUUID();
      const rows = await database`
        insert into public.match_daily_selections(profile_id, request_key, expires_at, lease_token, lease_until)
        values(${profileId}::uuid, ${key}, ${expiresAt}::timestamptz, ${token}::uuid, clock_timestamp()+interval '90 seconds')
        on conflict(profile_id) do update set request_key=excluded.request_key, expires_at=excluded.expires_at,
          lease_token=excluded.lease_token, lease_until=excluded.lease_until, selected_items=null, computed_at=null
        where match_daily_selections.request_key<>excluded.request_key
          or match_daily_selections.expires_at<=clock_timestamp()
          or (match_daily_selections.selected_items is null and match_daily_selections.lease_until<=clock_timestamp())
        returning profile_id
      `;
      return rows.length ? token : null;
    },
    async complete(profileId: string, key: string, token: string, selection: Selection) {
      const rows = await database`
        update public.match_daily_selections set selected_items=${database.json(selection.items)}, computed_at=clock_timestamp()
        where profile_id=${profileId}::uuid and request_key=${key} and lease_token=${token}::uuid
          and lease_until>clock_timestamp() and expires_at>clock_timestamp() and selected_items is null
        returning profile_id
      `;
      return rows.length > 0;
    },
    async release(profileId: string, key: string, token: string) {
      await database`
        update public.match_daily_selections set lease_until=clock_timestamp()
        where profile_id=${profileId}::uuid and request_key=${key} and lease_token=${token}::uuid and selected_items is null
      `;
    },
  };
}
