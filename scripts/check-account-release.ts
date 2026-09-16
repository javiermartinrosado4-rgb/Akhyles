import { lookup } from "node:dns/promises";
import { requirePublicHttps } from "../src/logic/endpoints";
async function main(){
  const url=requirePublicHttps(process.env.EXPO_PUBLIC_ACCOUNT_URL??"");
  const addresses=await lookup(url.hostname,{all:true});
  if(!addresses.length||addresses.some(({address})=>{
    if(address.includes(":"))return !/^[23][0-9a-f]{3}:/i.test(address);
    const [a,b,c]=address.split(".").map(Number);
    return a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||
      (a===192&&(b===168||(b===0&&(c===0||c===2))))||(a===198&&(b===18||b===19||(b===51&&c===100)))||
      (a===203&&b===0&&c===113)||(a===100&&b>=64&&b<=127);
  }))throw new Error("El DNS de cuentas debe apuntar a direcciones públicas.");
  const response=await fetch(`${url.toString().replace(/\/$/,"")}/health`,{redirect:"error",signal:AbortSignal.timeout(15000)});
  const body=await response.json();
  if(!response.ok||body.service!=="akhyles-accounts"||body.ok!==true||body.schema!==1)throw new Error("Servicio de cuentas no preparado.");
  console.log("Servicio de cuentas HTTPS/DNS comprobado. Google:",body.googleConfigured?"configurado":"pendiente; solo correo disponible");
}
void main().catch(()=>{console.error("La URL de cuentas no supera HTTPS, DNS o salud del servicio.");process.exitCode=1;});
