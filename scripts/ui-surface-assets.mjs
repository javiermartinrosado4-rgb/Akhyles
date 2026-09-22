import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const output = path.resolve("assets/ui");
await fs.mkdir(output, { recursive: true });

const surfaces = {
  "gold-surface.png": [
    [0, "#E0BD77"],
    [0.28, "#CFAB63"],
    [0.58, "#C39850"],
    [1, "#B98842"],
  ],
  "emerald-surface.png": [
    [0, "#327E65"],
    [0.5, "#236A53"],
    [1, "#174D3D"],
  ],
};

for (const [name, stops] of Object.entries(surfaces)) {
  const stopMarkup = stops.map(([offset, color]) => `<stop offset="${offset * 100}%" stop-color="${color}"/>`).join("");
  const svg = `<svg width="512" height="128" viewBox="0 0 512 128" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="surface" x1="0" y1="0" x2="512" y2="128" gradientUnits="userSpaceOnUse">${stopMarkup}</linearGradient></defs><rect width="512" height="128" fill="url(#surface)"/></svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(output, name));
}
