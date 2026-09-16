<?php
declare(strict_types=1);
// Copy to config.local.php OUTSIDE the public directory. Never commit secrets.
return [
    'dsn' => 'mysql:host=DATABASE_HOST;dbname=DATABASE_NAME;charset=utf8mb4',
    'db_user' => 'DATABASE_USER',
    'db_password' => '',
    'encryption_key' => '', // base64_encode(random_bytes(32)); keep an offline recovery copy
    'google_client_id' => '', // WEB client ID; register Android package + signing SHA-1 separately
    // Shared only with the private Comunidad server. Generate at least 32 random bytes,
    // encode them in base64 and do not reuse the database or encryption keys.
    'community_federation_secret' => '',
    'origins' => ['https://akhyles.com', 'https://www.akhyles.com'],
    'smtp_host' => 'smtp.ionos.es',
    'smtp_port' => 465,
    'smtp_user' => 'javi@akhyles.com',
    'smtp_password' => '',
    'mail_from' => 'javi@akhyles.com',
    'app_link_url' => 'https://api.akhyles.com/verify',
    'privacy_url' => 'https://akhyles.com/politica-de-privacidad',
];
