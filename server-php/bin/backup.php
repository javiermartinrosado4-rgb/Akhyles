<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/bootstrap.php';
require dirname(__DIR__).'/src/Backup.php';
$folder=dirname(__DIR__).'/var/backups';
if(!is_dir($folder))mkdir($folder,0700,true);
$file=$folder.'/accounts-'.gmdate('Ymd-His').'-'.bin2hex(random_bytes(4)).'.encrypted';
$encrypted=\Akhyles\Backup::export($db,$accounts);
if(file_put_contents($file,$encrypted,LOCK_EX)===false)throw new RuntimeException('Backup write failed');
chmod($file,0600);
echo basename($file).' '.hash('sha256',$encrypted)."\n";
// Off-host replication and retention are deliberately explicit operations, not silent deletion.
