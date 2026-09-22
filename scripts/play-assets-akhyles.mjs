import sharp from "sharp";
import { Buffer } from "node:buffer";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../assets/play/", import.meta.url);
await mkdir(output, { recursive: true });
await sharp(fileURLToPath(new URL("../assets/play/Logo final.png", import.meta.url)))
  .resize(512, 512)
  .flatten({ background: "#070A09" })
  .png()
  .toFile(fileURLToPath(new URL("icon-512.png", output)));

const sourceLogo = fileURLToPath(new URL("../assets/play/Logo final.png", import.meta.url));
const logoMark = await sharp(sourceLogo).resize(300, 300, { fit: "contain" }).png().toBuffer();
const graphic = `<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="500" fill="#070A09"/>
  <text x="337" y="225" fill="#F5F7F3" font-family="Arial, sans-serif" font-size="100" font-weight="700" letter-spacing="13">AKHYLES</text>
  <text x="343" y="285" fill="#7DA997" font-family="Arial, sans-serif" font-size="30" letter-spacing="12">NO WEAK POINTS</text>
  <text x="343" y="365" fill="#C6D5CC" font-family="Arial, sans-serif" font-size="32">Rutinas de fuerza. Registro. Progreso.</text>
  <text x="343" y="422" fill="#7DA997" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="2">ENTRENA CON INTENCIÓN</text>
</svg>`;
await sharp({ create: { width: 1024, height: 500, channels: 4, background: "#070A09" } })
  .composite([{ input: Buffer.from(graphic), left: 0, top: 0 }, { input: logoMark, left: 25, top: 100 }])
  .flatten({ background: "#070A09" })
  .png()
  .toFile(fileURLToPath(new URL("feature-graphic.png", output)));
