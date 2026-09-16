<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/src/Accounts.php';
function fixtureSchema(PDO $db): void {
    $sql=file_get_contents(dirname(__DIR__).'/schema.sql');
    $sql=preg_replace('/\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;/',');',$sql);
    $sql=preg_replace('/^\s*INDEX\([^\n]+\),?\s*$/m','',$sql);
    $sql=preg_replace('/,\s*\)/',')',$sql);
    $db->exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');$db->exec($sql);
}
function fixtureConfig(): array {
    return ['encryption_key'=>base64_encode(hash('sha256','test-only-local-fixture-key',true)), 'google_client_id'=>'test-client'];
}
