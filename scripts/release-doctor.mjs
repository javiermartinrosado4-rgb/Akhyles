import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const targets=new Set(process.argv.slice(2));
if(!targets.size||[...targets].some(target=>!["web","android","api"].includes(target))) throw new Error("Uso: node scripts/release-doctor.mjs web|android|api [...]");
const run=(command,args)=>execFileSync(command,args,{stdio:"inherit"});
run(process.execPath,["node_modules/typescript/bin/tsc","--noEmit"]);
const config=readFileSync("app.config.ts","utf8"); const packageJson=JSON.parse(readFileSync("package.json","utf8"));
const version=config.match(/version:\s*"([^"]+)"/)?.[1]; const versionCode=config.match(/versionCode:\s*(\d+)/)?.[1];
if(!version||!versionCode||version!==packageJson.version) throw new Error("La versión de app.config.ts y package.json no coincide.");
if(targets.has("android")&&!existsSync("artifacts/android/akhyles-release.aab")) throw new Error("Falta el AAB firmado; compílalo y verifícalo antes de Play.");
if(targets.has("web")&&!process.env.EXPO_PUBLIC_ACCOUNT_URL) throw new Error("Web requiere EXPO_PUBLIC_ACCOUNT_URL de producción.");
if(targets.has("api")&&!existsSync("server-php/schema.sql")) throw new Error("No se encuentra el esquema de API.");
console.log(JSON.stringify({ok:true,targets:[...targets],version,versionCode,checkedAt:new Date().toISOString()}));
