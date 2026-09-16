<?php
declare(strict_types=1);
ini_set('display_errors','0');
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH) ?: '/';
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $path === '/verify') {
    $id = $_GET['challengeId'] ?? ''; $code = $_GET['code'] ?? '';
    if (!is_string($id) || !preg_match('/^[a-f0-9]{64}$/i',$id) || !is_string($code) || !preg_match('/^\d{8}$/',$code)) {
        http_response_code(400); header('Content-Type: text/html; charset=utf-8'); header('Referrer-Policy: no-referrer');
        echo '<!doctype html><title>Enlace no válido · Akhyles</title><p>Este enlace no es válido. Solicita otro desde Akhyles.</p>'; exit;
    }
    $app = 'akhyles://verify?'.http_build_query(['challengeId'=>$id,'code'=>$code], '', '&', PHP_QUERY_RFC3986);
    header('Content-Type: text/html; charset=utf-8'); header('Cache-Control: no-store'); header('Referrer-Policy: no-referrer');
    header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
    $safe = htmlspecialchars($app,ENT_QUOTES | ENT_SUBSTITUTE,'UTF-8');
    echo '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abre Akhyles</title>'
        .'<body style="margin:0;background:#e7e8e2;font-family:Arial,sans-serif;color:#0f1412"><main style="max-width:520px;margin:12vh auto;padding:32px;background:#fff;border:1px solid #d8e3d9;border-radius:20px;text-align:center"><b style="font-size:22px">AKHYLES</b><h1>Confirma tu cuenta</h1><p style="color:#52635a;line-height:1.5">Abre la app para confirmar tu cuenta y empezar a sincronizar tu progreso.</p><a href="'.$safe.'" style="display:inline-block;background:#21473e;color:#fff;text-decoration:none;font-weight:bold;padding:15px 22px;border-radius:12px">Abrir Akhyles</a><p style="color:#52635a;font-size:13px;margin-top:24px">Si no tienes la app instalada, instala la próxima versión y vuelve a abrir este correo.</p></main></body></html>';
    exit;
}
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
$requestId = bin2hex(random_bytes(8)); header('X-Request-Id: '.$requestId);
try {
    if (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off') {
        http_response_code(400); echo json_encode(['error'=>'HTTPS requerido.']); exit;
    }
    header('Strict-Transport-Security: max-age=31536000');
    require dirname(__DIR__).'/bootstrap.php';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        if (!in_array($origin,$config['origins'],true)) throw new \Akhyles\ApiError(403,'Origen no permitido.');
        header('Access-Control-Allow-Origin: '.$origin); header('Vary: Origin');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
    }
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
    $input = [];
    if (in_array($_SERVER['REQUEST_METHOD'],['POST','PATCH','PUT','DELETE'],true)) {
        if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) throw new \Akhyles\ApiError(415,'Se requiere JSON.');
        $raw=file_get_contents('php://input',false,null,0,4_500_001);
        if (strlen($raw)>4_500_000) throw new \Akhyles\ApiError(413,'La copia es demasiado grande.');
        try { $input=json_decode($raw,true,128,JSON_THROW_ON_ERROR); }
        catch (\JsonException) { throw new \Akhyles\ApiError(400,'JSON no válido.'); }
        if (!is_array($input) || !str_starts_with(ltrim($raw),'{')) throw new \Akhyles\ApiError(400,'Datos no válidos.');
    }
    // Some shared-hosting SAPIs do not populate HTTP_AUTHORIZATION in $_SERVER.
    // Apache still exposes it through getallheaders(), so accept that equivalent
    // source before treating a signed-in client as unauthenticated.
    $requestHeaders = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
    $token=preg_replace('/^Bearer /','',$_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ($requestHeaders['authorization'] ?? ''));
    if (str_starts_with($path,'/community')) {
        $communityPath=substr($path,10) ?: '/';
        $principal=$communityPath === '/health' ? ['id'=>'','name'=>''] : $accounts->communityIdentity($token);
        $result=$community->handle($_SERVER['REQUEST_METHOD'],$communityPath,$input,$principal);
    } else {
        $result=$accounts->handle($_SERVER['REQUEST_METHOD'],$path,$input,$token,$_SERVER['REMOTE_ADDR'] ?? 'unknown');
    }
    echo json_encode($result,JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    if (in_array($path,['/auth/register','/auth/forgot','/auth/verify','/auth/google'],true) && $_SERVER['REQUEST_METHOD']==='POST') {
        // The durable outbox is committed first. Cron retries delivery independently.
        if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
        // A delivery/DB error after the successful response must not append a
        // second JSON body or turn a committed registration into a failed one.
        try { $accounts->deliverMail($sender,1); }
        catch (Throwable $mailError) { error_log('Akhyles mail '.$requestId.' '.get_class($mailError)); }
    }
} catch (\Akhyles\ApiError $e) {
    http_response_code($e->status); echo json_encode(['error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    // Never log request bodies, email, credentials, tokens or database passwords.
    error_log('Akhyles accounts '.$requestId.' '.get_class($e));
    http_response_code(503); echo json_encode(['error'=>'No se ha podido completar la operación. Tus datos locales se conservan.']);
}
