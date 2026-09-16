<?php
declare(strict_types=1);
$dsn=getenv('AKHYLES_TEST_DSN');
if($dsn!=='mysql:host=127.0.0.1;port=33079;charset=utf8mb4')throw new RuntimeException('Only the isolated loopback MariaDB fixture is allowed');
$admin=new PDO($dsn,getenv('AKHYLES_TEST_USER'),getenv('AKHYLES_TEST_PASSWORD'));
$database='akhyles_test_'.bin2hex(random_bytes(6));
$admin->exec("CREATE DATABASE $database CHARACTER SET utf8mb4");
putenv('AKHYLES_TEST_DSN='.$dsn.';dbname='.$database);
require __DIR__.'/accounts.php';
