<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/bootstrap.php';
$db->exec(file_get_contents(dirname(__DIR__).'/schema.sql'));
echo "Akhyles account schema ready.\n";
