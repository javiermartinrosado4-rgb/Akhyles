<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
[$script,$email,$action]=array_pad($argv,3,null);
if(!is_string($email)||!filter_var($email,FILTER_VALIDATE_EMAIL)||!in_array($action,['enable','disable'],true))
    throw new RuntimeException('Usage: php bin/sync-v2.php athlete@example.com enable|disable');
require dirname(__DIR__).'/bootstrap.php';
$user=$db->prepare('SELECT id FROM account_users WHERE email=?');$user->execute([strtolower($email)]);$id=$user->fetchColumn();
if(!$id)throw new RuntimeException('Account not found.');
$db->prepare('INSERT INTO account_sync_meta (user_id,sync_cursor,v2_enabled) VALUES (?,0,?) ON DUPLICATE KEY UPDATE v2_enabled=VALUES(v2_enabled),migration_hash=NULL,migration_verified_at=NULL')->execute([$id,$action==='enable'?1:0]);
echo 'Sync V2 '.($action==='enable'?'enabled':'disabled').' for '.strtolower($email)."\n";
