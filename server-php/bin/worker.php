<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/bootstrap.php';
$accounts->cleanup();
echo json_encode($accounts->deliverMail($sender,10))."\n";
