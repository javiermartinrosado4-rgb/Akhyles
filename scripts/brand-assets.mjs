import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../assets/brand/", import.meta.url);
await mkdir(root, { recursive: true });
const finalLogo = fileURLToPath(new URL("../assets/play/Logo final.png", import.meta.url));
const squareLogo = () => sharp(finalLogo).resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png();
await squareLogo().toFile(fileURLToPath(new URL("foreground.png", root)));
await squareLogo().toFile(fileURLToPath(new URL("icon.png", root)));
const splashMark = await sharp(finalLogo).resize(260, 260, { fit: "contain" }).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0F1412" } })
  .composite([{ input: splashMark, left: 126, top: 126 }]).png().toFile(fileURLToPath(new URL("splash.png", root)));
await sharp(finalLogo).resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).grayscale().threshold(120).png().toFile(fileURLToPath(new URL("monochrome.png", root)));
