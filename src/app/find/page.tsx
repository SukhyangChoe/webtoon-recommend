import { redirect } from 'next/navigation';

// The retired browser-side catalog must never enter a public JS bundle.
export default function FindPage() { redirect('/match/search'); }
