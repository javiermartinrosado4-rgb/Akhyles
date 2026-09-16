<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/bootstrap.php';
require dirname(__DIR__).'/src/Backup.php';
$path=$argv[1]??'';
if(!$path || !is_file($path))throw new RuntimeException('Pass the encrypted backup file to restore into an EMPTY database.');
echo json_encode(\Akhyles\Backup::restore($db,$accounts,file_get_contents($path)))."\n";
