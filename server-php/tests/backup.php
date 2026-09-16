<?php
declare(strict_types=1);
require __DIR__.'/fixture.php';require dirname(__DIR__).'/src/Backup.php';
$db=new PDO('sqlite::memory:');fixtureSchema($db);$app=new \Akhyles\Accounts($db,fixtureConfig());
$db->exec("INSERT INTO account_users VALUES ('test-user','backup@example.test','Backup',NULL,NULL,1)");
$s=$db->prepare('INSERT INTO account_progress VALUES (?,1,?,?)');
$s->execute(['test-user',$app->encrypt(['routine'=>['keep-47.5kg']],'progress:test-user'),'today']);
$backup=\Akhyles\Backup::export($db,$app);
if(str_contains($backup,'backup@example.test')||str_contains($backup,'keep-47.5kg'))throw new RuntimeException('Plaintext backup');
$restore=new PDO('sqlite::memory:');fixtureSchema($restore);$target=new \Akhyles\Accounts($restore,fixtureConfig());
$counts=\Akhyles\Backup::restore($restore,$target,$backup);
if($counts['account_users']!==1||$counts['account_progress']!==1)throw new RuntimeException('Restore counts');
$payload=$restore->query('SELECT payload FROM account_progress')->fetchColumn();
if($target->decrypt($payload,'progress:test-user')['routine'][0]!=='keep-47.5kg')throw new RuntimeException('Lost progress');
try{\Akhyles\Backup::restore($restore,$target,$backup);throw new LogicException('Overwrote nonempty DB');}catch(RuntimeException){}
try{$target->decrypt($payload,'progress:another-user');throw new LogicException('Wrong owner decrypted');}catch(RuntimeException){}
$wrong=new \Akhyles\Accounts($restore,['encryption_key'=>base64_encode(random_bytes(32))]);
try{$wrong->decrypt($backup,'database-backup');throw new LogicException('Wrong key decrypted');}catch(RuntimeException){}
echo "PASS encrypted backup, restored weights, empty-target protection, owner binding and wrong-key rejection.\n";
