import Image from "next/image";
import { personaImageFor } from "../config/personaImages.mjs";

export function PersonaAvatar({ genreKey, className = "", priority = false, sizes = "(max-width: 540px) 100px, 120px" }: { genreKey?: string | null; className?: string; priority?: boolean; sizes?: string }) {
  const image = personaImageFor(genreKey, "sd");
  return <span className={`wm-persona-avatar ${className}`}><Image src={image.src} alt={image.alt} width={180} height={180} sizes={sizes} priority={priority} /></span>;
}
