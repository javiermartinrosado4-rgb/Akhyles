const output = "assets/brand/splash.png";
import sharp from "sharp";

// The native Android splash is deliberately blank. Its background matches the
// JS intro exactly, so the first visible logo is the animated kintsugi mark.
await sharp({
  create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
}).png().toFile(output);
