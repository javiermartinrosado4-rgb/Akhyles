import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createConnection } from 'node:net';
const bin=resolve('artifacts/tools/mariadb-11.4.13-winx64/bin');
const data=mkdtempSync(resolve('artifacts/tools/akhyles-db-test-'));
const password=randomBytes(24).toString('hex');
const init=spawnSync(resolve(bin,'mariadb-install-db.exe'),['--datadir='+data,'--password='+password,'--port=33079'],{encoding:'utf8'});
if(init.status!==0){console.error('Cannot initialize isolated database:',init.stderr);process.exit(1);}
const server=spawn(resolve(bin,'mariadbd.exe'),['--no-defaults','--datadir='+data,'--port=33079','--bind-address=127.0.0.1','--skip-name-resolve','--console'],{stdio:['ignore','ignore','ignore']});
async function available(){return new Promise(resolve=>{const s=createConnection({host:'127.0.0.1',port:33079});s.once('connect',()=>{s.destroy();resolve(true);});s.once('error',()=>resolve(false));});}
try{
  let ready=false;
  for(let i=0;i<60;i++){if(await available()){ready=true;break;}await new Promise(r=>setTimeout(r,500));}
  if(!ready)throw new Error('Isolated MariaDB did not start');
  const test=spawn(resolve('artifacts/tools/php/php.exe'),['server-php/tests/mysql.php'],{stdio:'inherit',env:{...process.env,AKHYLES_TEST_DSN:'mysql:host=127.0.0.1;port=33079;charset=utf8mb4',AKHYLES_TEST_USER:'root',AKHYLES_TEST_PASSWORD:password}});
  process.exitCode=await new Promise(r=>test.once('exit',code=>r(code??1)));
}finally{server.kill();}
