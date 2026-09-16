import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
mkdirSync('test-results', { recursive: true });
const php = spawn('artifacts/tools/php/php.exe', ['-S','127.0.0.1:8094','server-php/tests/router.php'],{stdio:'inherit'});
const expo = spawn(process.execPath, ['node_modules/expo/bin/cli','start','--web','--port','8093'],{
  stdio:'inherit', env:{...process.env,EXPO_PUBLIC_ACCOUNT_URL:'http://127.0.0.1:8094'},
});
function stop(){php.kill();expo.kill();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);expo.on('exit',()=>php.kill());
