export type ShareCardRow = { label: string; value?: string };

export type ShareCardTheme = "violet" | "indigo" | "mint" | "lilac" | "coral" | "navy" | "gold";

export type ShareCardModel = {
  eyebrow: string;
  title: string;
  subtitle: string;
  metric?: string;
  badge?: string;
  symbol?: string;
  imageSrc?: string;
  imageAlt?: string;
  theme?: ShareCardTheme;
  rows: ShareCardRow[];
  callout?: { title: string; body: string };
  footer: string;
  fileName: string;
};

const palettes: Record<ShareCardTheme, { accent: string; dark: string; soft: string; glow: string; warm: string }> = {
  violet: { accent: "#6c43ec", dark: "#4b28c8", soft: "#eee8ff", glow: "rgba(108,67,236,.17)", warm: "#f6f3ff" },
  indigo: { accent: "#4f56d9", dark: "#3438a9", soft: "#e9ebff", glow: "rgba(79,86,217,.18)", warm: "#dfe5ff" },
  mint: { accent: "#168d78", dark: "#0d6859", soft: "#def7ef", glow: "rgba(22,141,120,.18)", warm: "#e9fff3" },
  lilac: { accent: "#7052d9", dark: "#5036ad", soft: "#eeeaff", glow: "rgba(112,82,217,.16)", warm: "#f7f4ff" },
  coral: { accent: "#d64e57", dark: "#a42d3b", soft: "#ffe5e5", glow: "rgba(214,78,87,.18)", warm: "#fff3f6" },
  navy: { accent: "#316681", dark: "#1d465c", soft: "#e2f0f4", glow: "rgba(49,102,129,.18)", warm: "#e8f1dc" },
  gold: { accent: "#6847e8", dark: "#4330a8", soft: "#ebe7ff", glow: "rgba(104,71,232,.18)", warm: "#e7f8f4" },
};

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function wrappedLines(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const character of paragraph) {
      const candidate = `${line}${character}`;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawWrapped(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3) {
  const lines = wrappedLines(context, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) return text;
  let fitted = text;
  while (fitted && context.measureText(`${fitted}…`).width > maxWidth) fitted = fitted.slice(0, -1);
  return `${fitted}…`;
}

function loadCardImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("SHARE_CARD_CHARACTER_LOAD_FAILED"));
    image.src = src;
  });
}

function drawContained(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - renderedWidth) / 2, y + (height - renderedHeight) / 2, renderedWidth, renderedHeight);
}

export async function renderShareCardPng(model: ShareCardModel) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("SHARE_CARD_CANVAS_UNAVAILABLE");
  const palette = palettes[model.theme ?? "violet"];
  const characterImage = model.imageSrc ? await loadCardImage(model.imageSrc) : null;

  const background = context.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, palette.soft);
  background.addColorStop(0.55, "#fbfaff");
  background.addColorStop(1, palette.warm);
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1350);

  context.fillStyle = palette.glow;
  context.beginPath();
  context.arc(935, 130, 250, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(75, 196, 179, .1)";
  context.beginPath();
  context.arc(70, 1190, 280, 0, Math.PI * 2);
  context.fill();

  roundedRect(context, 74, 72, 932, 1206, 62);
  context.fillStyle = "rgba(255,255,255,.94)";
  context.fill();
  context.strokeStyle = palette.glow;
  context.lineWidth = 3;
  context.stroke();

  if (characterImage) drawContained(context, characterImage, 690, 170, 270, 450);

  context.fillStyle = palette.accent;
  context.font = "800 34px system-ui, -apple-system, sans-serif";
  context.fillText("웹툰궁합", 132, 148);
  context.textAlign = "right";
  context.fillText("WEBTOON FIT", 944, 148);
  context.textAlign = "left";

  if (model.symbol && !characterImage) {
    context.fillStyle = palette.soft;
    context.beginPath();
    context.arc(850, 285, 92, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = palette.accent;
    context.font = "900 92px system-ui, -apple-system, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(model.symbol, 850, 292);
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
  }

  let topY = 224;
  if (model.badge) {
    context.font = "800 25px system-ui, -apple-system, sans-serif";
    const badgeWidth = Math.min(520, context.measureText(model.badge).width + 62);
    roundedRect(context, 132, topY - 34, badgeWidth, 52, 26);
    context.fillStyle = palette.soft;
    context.fill();
    context.fillStyle = palette.dark;
    context.fillText(model.badge, 163, topY + 1);
    topY += 75;
  }

  context.fillStyle = palette.accent;
  context.font = "800 30px system-ui, -apple-system, sans-serif";
  context.fillText(model.eyebrow, 132, topY);

  context.fillStyle = "#241b3b";
  context.font = "900 66px system-ui, -apple-system, sans-serif";
  let nextY = drawWrapped(context, model.title, 132, topY + 86, characterImage || model.symbol ? 540 : 816, 82, 2) + 26;

  context.fillStyle = "#716987";
  context.font = "600 31px system-ui, -apple-system, sans-serif";
  nextY = drawWrapped(context, model.subtitle, 132, nextY, characterImage ? 545 : 816, 45, 3) + 34;

  if (model.metric) {
    context.fillStyle = palette.dark;
    context.font = "900 82px system-ui, -apple-system, sans-serif";
    context.fillText(model.metric, 132, nextY + 62);
    nextY += 112;
  }

  const visibleRows = model.rows.slice(0, 3);
  visibleRows.forEach((row, index) => {
    const rowY = nextY + index * 110;
    roundedRect(context, 132, rowY, 816, 92, 24);
    context.fillStyle = index === 0 ? palette.soft : "#faf8fd";
    context.fill();
    context.fillStyle = "#241b3b";
    context.font = "800 29px system-ui, -apple-system, sans-serif";
    context.fillText(fitText(context, row.label, row.value ? 350 : 730), 166, rowY + 56);
    if (row.value) {
      context.fillStyle = palette.dark;
      context.font = "900 29px system-ui, -apple-system, sans-serif";
      context.textAlign = "right";
      context.fillText(fitText(context, row.value, 400), 912, rowY + 56);
      context.textAlign = "left";
    }
  });

  if (model.callout) {
    const calloutY = Math.min(nextY + visibleRows.length * 110 + 30, 1040);
    roundedRect(context, 132, calloutY, 816, 122, 26);
    context.fillStyle = palette.soft;
    context.fill();
    context.strokeStyle = palette.glow;
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = palette.dark;
    context.font = "850 29px system-ui, -apple-system, sans-serif";
    context.fillText(model.callout.title, 166, calloutY + 47);
    context.fillStyle = "#716987";
    context.font = "600 24px system-ui, -apple-system, sans-serif";
    context.fillText(fitText(context, model.callout.body, 748), 166, calloutY + 88);
  }

  context.fillStyle = "#716987";
  context.font = "650 26px system-ui, -apple-system, sans-serif";
  context.fillText(model.footer, 132, 1202);
  context.fillStyle = palette.accent;
  context.font = "900 30px system-ui, -apple-system, sans-serif";
  context.textAlign = "right";
  context.fillText("webtoon fit", 944, 1202);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("SHARE_CARD_RENDER_FAILED")), "image/png", 0.95);
  });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
