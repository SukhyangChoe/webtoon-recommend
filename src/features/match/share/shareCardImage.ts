export type ShareCardRow = { label: string; value?: string };

export type ShareCardModel = {
  eyebrow: string;
  title: string;
  subtitle: string;
  metric?: string;
  rows: ShareCardRow[];
  footer: string;
  fileName: string;
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

export async function renderShareCardPng(model: ShareCardModel) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("SHARE_CARD_CANVAS_UNAVAILABLE");

  const background = context.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, "#f5f1ff");
  background.addColorStop(0.55, "#fffdf8");
  background.addColorStop(1, "#fff0c8");
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1350);

  context.fillStyle = "rgba(104, 71, 232, .09)";
  context.beginPath();
  context.arc(935, 130, 250, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255, 190, 46, .12)";
  context.beginPath();
  context.arc(70, 1190, 280, 0, Math.PI * 2);
  context.fill();

  roundedRect(context, 74, 72, 932, 1206, 62);
  context.fillStyle = "rgba(255,255,255,.94)";
  context.fill();
  context.strokeStyle = "rgba(104,71,232,.14)";
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = "#6847e8";
  context.font = "800 34px system-ui, -apple-system, sans-serif";
  context.fillText("웹툰궁합", 132, 148);
  context.textAlign = "right";
  context.fillText("✦  ✦", 944, 148);
  context.textAlign = "left";

  context.fillStyle = "#6847e8";
  context.font = "800 30px system-ui, -apple-system, sans-serif";
  context.fillText(model.eyebrow, 132, 244);

  context.fillStyle = "#241b3b";
  context.font = "900 66px system-ui, -apple-system, sans-serif";
  let nextY = drawWrapped(context, model.title, 132, 326, 816, 82, 3) + 22;

  context.fillStyle = "#716987";
  context.font = "600 31px system-ui, -apple-system, sans-serif";
  nextY = drawWrapped(context, model.subtitle, 132, nextY, 816, 45, 2) + 34;

  if (model.metric) {
    context.fillStyle = "#6847e8";
    context.font = "900 82px system-ui, -apple-system, sans-serif";
    context.fillText(model.metric, 132, nextY + 62);
    nextY += 112;
  }

  const visibleRows = model.rows.slice(0, 4);
  visibleRows.forEach((row, index) => {
    const rowY = nextY + index * 118;
    roundedRect(context, 132, rowY, 816, 92, 24);
    context.fillStyle = index === 0 ? "#f0ecff" : "#faf8fd";
    context.fill();
    context.fillStyle = "#241b3b";
    context.font = "800 32px system-ui, -apple-system, sans-serif";
    context.fillText(row.label, 166, rowY + 56);
    if (row.value) {
      context.fillStyle = "#6847e8";
      context.font = "900 32px system-ui, -apple-system, sans-serif";
      context.textAlign = "right";
      context.fillText(row.value, 912, rowY + 56);
      context.textAlign = "left";
    }
  });

  context.fillStyle = "#716987";
  context.font = "650 26px system-ui, -apple-system, sans-serif";
  context.fillText(model.footer, 132, 1202);
  context.fillStyle = "#6847e8";
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
