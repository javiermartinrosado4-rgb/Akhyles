import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const adbPath = process.env.ADB_PATH || join(process.env.LOCALAPPDATA, "Android/Sdk/platform-tools/adb.exe");
const serial = process.env.ANDROID_SERIAL || "emulator-5554";
const output = "artifacts/android/qa";
mkdirSync(output, { recursive: true });
export const adb = (...args) => execFileSync(adbPath, ["-s", serial, ...args], { encoding: "utf8", timeout: 30000, windowsHide: true });
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const decode = value => value.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&#10;", "\n");
export function snapshot() {
  adb("shell", "uiautomator", "dump", "/sdcard/akhyles-ui.xml");
  adb("pull", "/sdcard/akhyles-ui.xml", `${output}/ui.xml`);
  return [...readFileSync(`${output}/ui.xml`, "utf8").matchAll(/<node\s+([^>]+)>/g)].map(match =>
    Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])));
}
export function tapNode(node) {
  const coordinates = node.bounds.match(/\d+/g).map(Number);
  adb("shell", "input", "tap", String(Math.round((coordinates[0] + coordinates[2]) / 2)), String(Math.round((coordinates[1] + coordinates[3]) / 2)));
}
export async function find(label, scrolls = 0, className) {
  for (let i = 0; i <= scrolls; i++) {
    const nodes = snapshot();
    const visible = nodes.filter(node => {
      const [x1, y1, x2, y2] = node.bounds.match(/\d+/g).map(Number);
      return node.enabled !== "false" && (!className || node.class === className) && x2 > x1 && y2 - y1 >= 30;
    });
    const node = visible.find(node => node["content-desc"] === label) || visible.find(node => node.text === label);
    if (node) return node;
    if (i < scrolls) { adb("shell", "input", "swipe", "540", "1800", "540", "650", "300"); await delay(350); }
  }
  throw new Error(`Control no encontrado: ${label}`);
}
export async function tap(label, scrolls = 0) { tapNode(await find(label, scrolls)); await delay(350); }
export async function fill(label, value, scrolls = 0) {
  tapNode(await find(label, scrolls, "android.widget.EditText"));
  await delay(500);
  adb("shell", "input", "keyevent", "KEYCODE_MOVE_END");
  adb("shell", "input", "keycombination", "113", "29");
  adb("shell", "input", "text", value);
  // Hardware-keyboard emulators may have no IME to dismiss; Back would leave the app.
  if (/mInputShown=true|mIsInputViewShown=true/.test(adb("shell", "dumpsys", "input_method")))
    adb("shell", "input", "keyevent", "KEYCODE_BACK");
  await delay(250);
}
export function screenshot(name) {
  const png = execFileSync(adbPath, ["-s", serial, "exec-out", "screencap", "-p"], { timeout: 30000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  writeFileSync(`${output}/${name}.png`, png);
}

if (process.argv[1]?.endsWith("android-ui.mjs")) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "snapshot") console.log(snapshot().filter(n => n.text || n["content-desc"]).map(n => ({ text: n.text, label: n["content-desc"], class: n.class, bounds: n.bounds, selected: n.checked })).map(n => JSON.stringify(n)).join("\n"));
  else if (command === "tap") await tap(args[0], Number(args[1] || 0));
  else if (command === "fill") await fill(args[0], args[1], Number(args[2] || 0));
  else if (command === "screenshot") screenshot(args[0]);
}
