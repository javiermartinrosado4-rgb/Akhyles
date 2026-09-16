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

const graphic = `<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="500" fill="#070A09"/>
  <path fill="#7DA997" d="M175 75 65 258h53l57-96 57 96h53L175 75Z"/>
  <path fill="#7DA997" d="M77 283h196l-24-40H101l-24 40Z"/>
  <text x="337" y="225" fill="#F5F7F3" font-family="Arial, sans-serif" font-size="100" font-weight="700" letter-spacing="13">AKHYLES</text>
  <text x="343" y="285" fill="#7DA997" font-family="Arial, sans-serif" font-size="30" letter-spacing="12">NO WEAK POINTS</text>
  <text x="343" y="365" fill="#C6D5CC" font-family="Arial, sans-serif" font-size="32">Rutinas de fuerza. Registro. Progreso.</text>
  <text x="343" y="422" fill="#7DA997" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="2">ENTRENA CON INTENCIÓN</text>
</svg>`;
await sharp(Buffer.from(graphic))
  .flatten({ background: "#070A09" })
  .png()
  .toFile(fileURLToPath(new URL("feature-graphic.png", output)));
