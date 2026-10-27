const paths: Record<string, string> = {
  heart: 'M20.8 4.7a5 5 0 0 0-7 0L12 6.5l-1.8-1.8a5 5 0 0 0-7 7L12 21l8.8-9.3a5 5 0 0 0 0-7Z',
  bond: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  pen: 'm4 16 11-11 4 4L8 20l-5 1 1-5ZM13 7l4 4M4 17l3 3M17 3l4 4',
  palette: 'M12 3a9 9 0 1 0 0 18c2 0 3-1 2-3s0-3 2-3h2c3 0 4-3 3-6a10 10 0 0 0-9-6ZM7 10h.01M11 7h.01M16 8h.01M6 15h.01',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  growth: 'M3 19l6-6 4 3 8-11M14 5h7v7',
  spark: 'm12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z',
};
export function WorkFeatureIcon({ name }: { name: string }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.spark} /></svg>;
}
