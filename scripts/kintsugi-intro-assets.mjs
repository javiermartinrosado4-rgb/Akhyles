import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const source = "assets/brand/app-mark.png";
const output = "assets/preview";
const size = 1024;

await mkdir(output, { recursive: true });

// The cuts follow the main kintsugi seams, with a few extra facets so the mark
// arrives as broken marble rather than as its three finished parts.
const fragments = {
  crownTip: "512,94 545,184 590,260 500,440 462,334",
  crownLeft: "64,790 512,94 545,184 462,334 300,445 210,620",
  crownRight: "512,94 918,790 808,650 615,620 500,440 590,260 545,184",
  middleLeft: "64,790 210,620 300,445 375,458 385,620 278,790",
  middleCenter: "300,445 462,334 590,260 500,440 615,620 510,446 385,620 375,458",
  middleRight: "510,446 615,620 808,650 918,790 710,790",
  baseLeft: "105,998 210,846 535,846 610,998",
  baseRight: "535,846 915,846 1000,998 610,998",
};

const markShapes = [
  "68,790 512,94 512,445 278,790",
  "512,94 918,790 710,790 512,445",
  "210,846 915,846 1000,998 105,998",
];

const polygonMask = points => Buffer.from(
  `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><polygon points="${points}" fill="white"/></svg>`,
);
const markMask = Buffer.from(
  `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${markShapes.map(points => `<polygon points="${points}" fill="white"/>`).join("")}</svg>`,
);

const complete = await sharp(source)
  .ensureAlpha()
  .composite([{ input: markMask, blend: "dest-in" }])
  .png()
  .toBuffer();
const broken = await sharp(complete).raw().toBuffer({ resolveWithObject: true });

// The original gold becomes a dark fracture on each loose fragment. It is
// preserved separately and revealed only after all pieces have assembled.
for (let index = 0; index < broken.data.length; index += broken.info.channels) {
  const red = broken.data[index];
  const green = broken.data[index + 1];
  const blue = broken.data[index + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const isGold = red > 65 && red > green * 1.08 && green > blue * 1.16 && saturation > 0.28;
  if (isGold) {
    broken.data[index] = 19;
    broken.data[index + 1] = 25;
    broken.data[index + 2] = 22;
  }
}
const brokenMark = await sharp(broken.data, { raw: broken.info })
  .modulate({ saturation: 0.76, brightness: 0.9 })
  .png()
  .toBuffer();

for (const [name, points] of Object.entries(fragments)) {
  await sharp(brokenMark)
    .composite([{ input: polygonMask(points), blend: "dest-in" }])
    .png()
    .toFile(`${output}/kintsugi-curved-fragment-${name}.png`);
}

await sharp(complete).toFile(`${output}/kintsugi-curved-complete.png`);

const gold = await sharp(complete).raw().toBuffer({ resolveWithObject: true });
for (let index = 0; index < gold.data.length; index += gold.info.channels) {
  const pixel = index / gold.info.channels;
  const x = pixel % gold.info.width;
  const y = Math.floor(pixel / gold.info.width);
  const red = gold.data[index];
  const green = gold.data[index + 1];
  const blue = gold.data[index + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const isGold = red > 65 && red > green * 1.08 && green > blue * 1.16 && saturation > 0.28;
  if (!isGold) gold.data[index + 3] = 0;
  // Remove only the thin outer upper-right contour. It is not a fracture.
  const outerEdgeCenter = 512 + (y - 94) * 0.6;
  if (isGold && y >= 94 && y <= 285 && x >= outerEdgeCenter - 13 && x <= outerEdgeCenter + 14) gold.data[index + 3] = 0;
}
await sharp(gold.data, { raw: gold.info }).png().toFile(`${output}/kintsugi-cracks-only-gold-v2.png`);
