<?php
declare(strict_types=1);
require __DIR__.'/vendor/autoload.php';
require __DIR__.'/src/Accounts.php';
require __DIR__.'/src/Community.php';
$config = require __DIR__.'/config.local.php';
$db = new PDO($config['dsn'],$config['db_user'] ?? '',$config['db_password'] ?? '',[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES=>false,
]);
$accounts = new \Akhyles\Accounts($db,$config);
$community = new \Akhyles\Community($db);
$sender = static function(string $to, string $subject, string $text, ?string $html = null) use ($config): void {
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP(); $mail->Host = $config['smtp_host']; $mail->Port = (int)$config['smtp_port'];
    $mail->SMTPAuth = true; $mail->Username = $config['smtp_user']; $mail->Password = $config['smtp_password'];
    $mail->SMTPSecure = $mail->Port === 465 ? \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS : \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Timeout = 10; $mail->CharSet='UTF-8';
    $mail->setFrom($config['mail_from'],'Akhyles'); $mail->addAddress($to);
    $mail->Subject=$subject; $mail->Body=$html ?? nl2br(htmlspecialchars($text,ENT_QUOTES | ENT_SUBSTITUTE,'UTF-8'));
    $mail->AltBody=$text; if ($html !== null) $mail->isHTML(true); $mail->send();
};
