import { execFileSync } from "node:child_process";

try {
  const npmCli=process.env.npm_execpath;
  if(!npmCli) throw new Error("Ejecuta esta comprobación mediante npm run security:dependencies.");
  execFileSync(process.execPath,[npmCli,"audit","--omit=dev","--audit-level=high","--json"],{stdio:"pipe"});
  console.log("Dependencias de producción: sin vulnerabilidades altas o críticas.");
} catch (error) {
  const output=Buffer.concat([error.stdout||Buffer.alloc(0),error.stderr||Buffer.alloc(0)]).toString();
  let report; try { report=JSON.parse(output); } catch { throw new Error("No se pudo completar npm audit. Revisa la conexión o el registro."); }
  const counts=report.metadata?.vulnerabilities??{};
  if((counts.high??0)>0||(counts.critical??0)>0) throw new Error(`Dependencias bloqueantes: ${counts.high??0} altas, ${counts.critical??0} críticas.`);
  console.log("Dependencias de producción: sin vulnerabilidades altas o críticas.");
}
