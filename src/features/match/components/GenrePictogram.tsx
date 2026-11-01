import type { GenreKey } from '../data/questionSeed';

/** Original genre motifs, drawn on the same grid and stroke scale as the cyan UI. */
const paths: Record<GenreKey, string> = {
  fantasy: 'm7 27 13-13 3 3L10 30 7 27Zm10-10 3 3M23 3l1.8 4.2L29 9l-4.2 1.8L23 15l-1.8-4.2L17 9l4.2-1.8L23 3ZM7 5v6M4 8h6M27 22v4M25 24h4',
  murim: 'm12 20 12-12 5-5-1 8-12 12M24 8l3 3M8 16l12 12M10 22l-6 6 2 2 6-6M3 27l4 4',
  romance: 'M16 27 5.8 17.2a6.2 6.2 0 0 1 8.8-8.8L16 10l1.4-1.6a6.2 6.2 0 0 1 8.8 8.8L16 27ZM5 4l-2-2M27 4l2-2M16 2v3',
  ropan: 'm5 13 3 12h16l3-12-7 5-4-9-4 9-7-5ZM9 29h14M3 8h4M5 6v4M25 5h4M27 3v4M14 23h4',
  action: 'm12 3 3 6 6-5-1 8 9 1-7 5 5 7-9-2-3 7-3-8-9 1 5-6-5-6 8 1 1-9ZM18 11l-6 7h5l-2 5',
  thriller_horror: 'M3 16s5-8 13-8 13 8 13 8-5 8-13 8S3 16 3 16ZM20 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM16 2v3M5 5l3 3M27 5l-3 3M16 27v3',
  drama_daily: 'M6 14h15v9a5 5 0 0 1-5 5h-5a5 5 0 0 1-5-5v-9ZM21 16h3a4 4 0 0 1 0 8h-3M4 30h23M10 10c-3-3 3-4 0-7M17 10c-3-3 3-4 0-7',
  comedy: 'M5 5c7 3 15 3 22 0v13c0 6-6 11-11 13C11 29 5 24 5 18V5ZM9 14c1-2 3-2 5 0M19 14c1-2 3-2 5 0M10 20c3 6 9 6 12 0M2 4V1M30 4V1',
  sports: 'M28 17a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM8 17h20M18 7v20M11 10c8 3 8 11 0 14M25 10c-8 3-8 11 0 14M2 8h5M1 13h4M2 23h4',
};

export function GenrePictogram({ genre }: { genre: GenreKey }) {
  return <svg className="match-genre-pictogram" data-genre={genre} width="30" height="30" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[genre]} /></svg>;
}
