import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const directory = resolve(process.argv[2]);
const credentials = join(directory, "signing.properties");
if (existsSync(credentials)) {
  console.log("Se reutiliza la firma Android existente.");
} else {
  await mkdir(directory, { recursive: true });
  const keystore = join(directory, "akhyles.jks");
  if (existsSync(keystore)) throw new Error("Ya existe un keystore sin sus propiedades. Recupera las credenciales antes de continuar.");
  const password = randomBytes(32).toString("hex");
  const result = spawnSync(join(process.env.JAVA_HOME, "bin", "keytool.exe"), [
    "-genkeypair", "-keystore", keystore, "-storetype", "JKS",
    "-alias", "akhyles", "-keyalg", "RSA", "-keysize", "2048",
    "-validity", "10000", "-dname", "CN=Akhyles", "-storepass:env", "AKHYLES_SIGN_PASSWORD", "-keypass:env", "AKHYLES_SIGN_PASSWORD",
  ], { env: { ...process.env, AKHYLES_SIGN_PASSWORD: password }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "No se pudo generar la firma");
  await writeFile(credentials, `storeFile=${keystore.replaceAll("\\", "/")}\nstorePassword=${password}\nkeyAlias=akhyles\nkeyPassword=${password}\n`, { flag: "wx", mode: 0o600 });
  console.log("Firma Android creada fuera del repositorio. Conserva una copia de seguridad de esta carpeta.");
}
