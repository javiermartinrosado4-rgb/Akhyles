<?php
declare(strict_types=1);
require __DIR__.'/fixture.php';
$db=new PDO(getenv('AKHYLES_TEST_DSN') ?: 'sqlite::memory:',getenv('AKHYLES_TEST_USER') ?: '',getenv('AKHYLES_TEST_PASSWORD') ?: '');
$db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
if($db->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite') fixtureSchema($db);
else { $db->exec(file_get_contents(dirname(__DIR__).'/schema.sql')); }
if((int)$db->query('SELECT COUNT(*) FROM account_users')->fetchColumn()!==0)throw new RuntimeException('Tests require a fresh empty dedicated database.');
$claims=[];$config=fixtureConfig();
$app=new \Akhyles\Accounts($db,$config,function($token)use(&$claims){return isset($claims[$token]) ? $claims[$token]+['aud'=>'test-client','iss'=>'https://accounts.google.com','exp'=>time()+300] : false;});
$passed=0;
function check(bool $result,string $label):void {global $passed;if(!$result)throw new RuntimeException('FAIL: '.$label);$passed++;echo 'PASS '.$label."\n";}
function status(int $expected,callable $fn,string $label):void {try{$fn();throw new RuntimeException('Expected error '.$expected);}catch(\Akhyles\ApiError $e){check($e->status===$expected,$label);}}
function call(string $method,string $path,array $data=[],string $token=''):array {global $app;return $app->handle($method,$path,$data,$token,'test-'.bin2hex(random_bytes(6)));}
$mail=[];
function drain():void{global $app,$mail;$app->deliverMail(function($email,$subject,$text)use(&$mail){$mail[]=['email'=>$email,'subject'=>$subject,'text'=>$text];},50);}
function codeFor(string $email):string{global $mail;drain();foreach(array_reverse($mail)as$m){if($m['email']===$email&&preg_match('/\b([0-9]{8})\b/',$m['text'],$hit))return $hit[1];}throw new RuntimeException('No code');}
function register(string $email):array{$r=call('POST','/auth/register',['email'=>$email,'name'=>'Atleta','password'=>'correct-horse-password']);return call('POST','/auth/verify',['challengeId'=>$r['challengeId'],'code'=>codeFor($email)]);}
$first=call('POST','/auth/register',['email'=>'alice@example.test','name'=>'Alice','password'=>'correct-horse-password']);
check(!isset($first['token'])&&(int)$db->query('SELECT COUNT(*) FROM account_users')->fetchColumn()===0,'no account or session before mailbox verification');
$code=codeFor('alice@example.test');
status(400,fn()=>call('POST','/auth/verify',['challengeId'=>$first['challengeId'],'code'=>'00000000']),'reject wrong verification code');
$alice=call('POST','/auth/verify',['challengeId'=>$first['challengeId'],'code'=>$code]);
status(400,fn()=>call('POST','/auth/verify',['challengeId'=>$first['challengeId'],'code'=>$code]),'verification code cannot be replayed');
drain();check(count(array_filter($mail,fn($m)=>$m['subject']==='Bienvenido a Akhyles'))===1,'welcome queued after verified registration');
check(call('POST','/auth/login',['email'=>'ALICE@example.test','password'=>'correct-horse-password'])['user']['id']===$alice['user']['id'],'case normalized email login');
status(401,fn()=>call('POST','/auth/login',['email'=>'alice@example.test','password'=>'wrong-password-long']),'wrong password rejected');
$bob=register('bob@example.test');
$state=['version'=>1,'profile'=>['weight'=>'80'],'preferences'=>[],'onboardingStep'=>0,'completed'=>true,'theme'=>'system','routine'=>[],'history'=>[['id'=>'workout-1','records'=>[]]]];
$state['routineVersions']=[['effectiveFrom'=>'2026-08-01','profile'=>['weight'=>'80','sex'=>'male','days'=>4],'routine'=>[]]];
$saved=call('PUT','/sync',['revision'=>0,'state'=>$state],$alice['token']);check($saved['revision']===1,'first progress upload');
$v2status=call('GET','/sync/v2/status',[],$alice['token']);check($v2status['enabled']===false,'sync v2 is disabled by default');
$db->prepare('UPDATE account_sync_meta SET v2_enabled=1 WHERE user_id=?')->execute([$alice['user']['id']]);
$op=['opId'=>'sync2-test-operation-0001','type'=>'state','id'=>'primary','baseRevision'=>0,'data'=>['version'=>1,'marker'=>'v2-private']];
$v2=call('POST','/sync/v2/batch',['cursor'=>0,'operations'=>[$op]],$alice['token']);check($v2['acknowledged']===[$op['opId']]&&count($v2['changes'])===1,'sync v2 stores an incremental operation');
$retry=call('POST','/sync/v2/batch',['cursor'=>0,'operations'=>[$op]],$alice['token']);check($retry['acknowledged']===[$op['opId']]&&$retry['serverCursor']===1,'sync v2 retry is idempotent');
$storedV2=$db->query("SELECT payload FROM account_sync_entities WHERE user_id='".$alice['user']['id']."'")->fetchColumn();check(!str_contains($storedV2,'v2-private'),'sync v2 payload is encrypted at rest');
check(call('GET','/sync',[],$bob['token'])['state']===null,'another account cannot read progress');
status(401,fn()=>call('GET','/sync',[],'forged-token'),'unauthenticated progress rejected');
status(409,fn()=>call('PUT','/sync',['revision'=>0,'state'=>$state],$alice['token']),'stale device cannot overwrite newer revision');
$stored=$db->query('SELECT payload FROM account_progress WHERE revision=1')->fetchColumn();check(!str_contains($stored,'workout-1'),'progress encrypted at rest');
check(call('GET','/sync',[],$alice['token'])['state']===$state,'progress restores exactly including history');
$maps=$state;$maps['preferences']=['names'=>[],'weights'=>[],'ranges'=>[],'barWeights'=>[]];
$activePrescription=['id'=>'active-press','exerciseId'=>'chest-press','sets'=>2,'range'=>[8,10],'weight'=>30];
$maps['active']=['day'=>['id'=>'active-day','name'=>'Activo','exercises'=>[$activePrescription]],'index'=>0,'startedAt'=>'2026-09-14T10:00:00Z','draft'=>[['weight'=>'30','reps'=>'']],'records'=>[],'drafts'=>[],'barWeights'=>[],'loadModes'=>[]];
call('PUT','/sync',['revision'=>0,'state'=>$maps],$bob['token']);
$roundTrip=json_encode(call('GET','/sync',[],$bob['token'])['state']);
check(str_contains($roundTrip,'"weights":{}')&&str_contains($roundTrip,'"names":{}'),'empty dictionary fields round-trip as objects, not arrays');
check(str_contains($roundTrip,'"barWeights":{}')&&str_contains($roundTrip,'"loadModes":{}'),'bar weights and load modes retain their dictionary type');
$invalidRoutine=$state;$invalidRoutine['routine']=[['id'=>'bad','name'=>'Rota','exercises'=>[['id'=>'bad','exerciseId'=>'chest-press','sets'=>99,'range'=>[8,10],'weight'=>0]]]];
status(400,fn()=>call('PUT','/sync',['revision'=>1,'state'=>$invalidRoutine],$alice['token']),'invalid nested routine is rejected before encryption');
$invalidRecord=$state;$invalidRecord['history']=[['id'=>'broken','records'=>[['prescription'=>$activePrescription,'name'=>'Press','type'=>'compound','sets'=>[['weight'=>30,'reps'=>0]]]]]];
status(400,fn()=>call('PUT','/sync',['revision'=>1,'state'=>$invalidRecord],$alice['token']),'invalid nested record is rejected before encryption');
$changed=$state;$changed['profile']['weight']='82';call('PUT','/sync',['revision'=>1,'state'=>$changed],$alice['token']);
check(call('GET','/sync/versions/1',[],$alice['token'])['state']===$state,'previous version recoverable');
check(call('GET','/sync/versions/1',[],$bob['token'])['state']['profile']['weight']==='80','same revision number returns only the authenticated owner copy');
status(404,fn()=>call('GET','/sync/versions/2',[],$bob['token']),'another account revision is inaccessible');
status(400,fn()=>call('PUT','/sync',['revision'=>2,'state'=>$state+['cloud'=>['owner'=>'bob']]],$alice['token']),'device metadata rejected on server');
$reset=call('POST','/auth/forgot',['email'=>'alice@example.test']);
call('POST','/auth/reset',['challengeId'=>$reset['challengeId'],'code'=>codeFor('alice@example.test'),'password'=>'new-correct-password']);
status(401,fn()=>call('GET','/sync',[],$alice['token']),'password reset revokes existing sessions');
$alice=call('POST','/auth/login',['email'=>'alice@example.test','password'=>'new-correct-password']);
check(call('GET','/sync',[],$alice['token'])['revision']===2,'password reset preserves progress');
$nonce=call('GET','/auth/google/config')['nonce'];$claims['good']=['sub'=>'google-user','nonce'=>$nonce,'email'=>'googleuser@gmail.com','email_verified'=>true,'name'=>'Google'];
$google=call('POST','/auth/google',['credential'=>'good','nonce'=>$nonce]);check($google['user']['googleLinked'],'Google creates verified account');
status(401,fn()=>call('POST','/auth/google',['credential'=>'good','nonce'=>$nonce]),'Google nonce replay rejected');
$nonce=call('GET','/auth/google/config')['nonce'];$claims['collision']=['sub'=>'other-google','nonce'=>$nonce,'email'=>'alice@example.test','email_verified'=>true,'hd'=>'example.test'];
status(409,fn()=>call('POST','/auth/google',['credential'=>'collision','nonce'=>$nonce]),'matching email alone does not link Google');
$nonce=call('GET','/auth/google/config')['nonce'];$claims['link']=['sub'=>'other-google','nonce'=>$nonce,'email'=>'alice@example.test','email_verified'=>true];
check(call('POST','/auth/google/link',['credential'=>'link','nonce'=>$nonce],$alice['token'])['googleLinked'],'authenticated owner can link Google');
$nonce=call('GET','/auth/google/config')['nonce'];
status(401,fn()=>call('POST','/auth/google',['credential'=>'forged','nonce'=>$nonce]),'forged Google identity rejected');
$nonce=call('GET','/auth/google/config')['nonce'];$claims['bad-audience']=['sub'=>'bad-user','nonce'=>$nonce,'email'=>'bad@gmail.com','email_verified'=>true,'aud'=>'another-client'];
status(401,fn()=>call('POST','/auth/google',['credential'=>'bad-audience','nonce'=>$nonce]),'Google token from another app rejected');
$nonce=call('GET','/auth/google/config')['nonce'];$claims['expired']=['sub'=>'expired-user','nonce'=>$nonce,'email'=>'bad@gmail.com','email_verified'=>true,'exp'=>time()-1];
status(401,fn()=>call('POST','/auth/google',['credential'=>'expired','nonce'=>$nonce]),'expired Google token rejected');
$lock=call('POST','/auth/register',['email'=>'locked@example.test','name'=>'Test','password'=>'correct-horse-password']);$good=codeFor('locked@example.test');
for($i=0;$i<5;$i++)status(400,fn()=>call('POST','/auth/verify',['challengeId'=>$lock['challengeId'],'code'=>'00000000']),'invalid challenge attempt '.($i+1));
status(400,fn()=>call('POST','/auth/verify',['challengeId'=>$lock['challengeId'],'code'=>$good]),'challenge locks after five failures');
status(400,fn()=>call('DELETE','/me',['confirmEmail'=>'wrong@example.test'],$alice['token']),'delete requires exact account confirmation');
call('DELETE','/me',['confirmEmail'=>'alice@example.test'],$alice['token']);
check((int)$db->query("SELECT COUNT(*) FROM account_versions WHERE user_id='".$alice['user']['id']."'")->fetchColumn()===0,'account deletion cascades to historical copies');
status(401,fn()=>call('GET','/sync',[],$alice['token']),'deleted account sessions invalidated');
check(call('GET','/me',[],$bob['token'])['email']==='bob@example.test','deletion preserves other accounts');
for($revision=1;$revision<=24;$revision++)call('PUT','/sync',['revision'=>$revision,'state'=>$state],$bob['token']);
$retained=$db->prepare('SELECT COUNT(*) FROM account_versions WHERE user_id=?');$retained->execute([$bob['user']['id']]);
check((int)$retained->fetchColumn()===20,'exactly twenty historical versions retained after repeated uploads');
echo "$passed account integration assertions passed.\n";
