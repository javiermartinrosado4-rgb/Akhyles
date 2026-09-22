import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const source = "assets/brand/monochrome.png";
const target = "assets/brand/notification-icon.png";
const { data, info } = await sharp(source).raw().toBuffer({ resolveWithObject: true });

// Android small notification icons must be a clean monochrome mask. The
// adaptive icon can keep the marble texture; the status-bar icon cannot.
for (let index = 0; index < data.length; index += info.channels) {
  if (data[index + 3] > 0) {
    data[index] = 255;
    data[index + 1] = 255;
    data[index + 2] = 255;
  }
}

await mkdir("assets/brand", { recursive: true });
await sharp(data, { raw: info }).png().toFile(target);
