<?php
declare(strict_types=1);
namespace Akhyles;

use PDO;
use RuntimeException;
use Throwable;

final class ApiError extends RuntimeException {
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}

final class Accounts {
    public function __construct(private PDO $db, private array $config, private $googleVerifier = null) {
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        if (strlen(base64_decode($config['encryption_key'] ?? '', true) ?: '') !== 32) {
            throw new RuntimeException('A 32-byte encryption key is required.');
        }
    }
    private function run(string $sql, array $args = []): \PDOStatement {
        $s = $this->db->prepare($sql); $s->execute($args); return $s;
    }
    private function one(string $sql, array $args = []): array|false { return $this->run($sql, $args)->fetch(); }
    private function transaction(callable $fn): mixed {
        $this->db->beginTransaction();
        try { $result = $fn(); $this->db->commit(); return $result; }
        catch (Throwable $e) { if ($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
    private function fail(int $status, string $text): never { throw new ApiError($status, $text); }
    private function text(mixed $value, int $max): string {
        if (!is_string($value) || strlen($value) > $max) $this->fail(400, 'Revisa los campos indicados.');
        return trim($value);
    }
    private function email(mixed $value): string {
        $email = strtolower($this->text($value, 254));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $this->fail(400, 'Introduce un correo válido.');
        return $email;
    }
    private function password(mixed $value): string {
        // Bcrypt's input limit is bytes, not characters; never silently truncate.
        if (!is_string($value) || mb_strlen($value) < 12 || strlen($value) > 72 || str_contains($value, "\0"))
            $this->fail(400, 'Usa al menos 12 caracteres. Si tu contraseña es muy larga o contiene muchos emojis, reduce su longitud.');
        return $value;
    }
    public function encrypt(array $value, string $context): string {
        $iv = random_bytes(12); $tag = '';
        $cipher = openssl_encrypt(json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
            'aes-256-gcm', base64_decode($this->config['encryption_key']), OPENSSL_RAW_DATA, $iv, $tag, $context);
        if ($cipher === false) throw new RuntimeException('Encryption failed');
        return base64_encode($iv . $tag . $cipher);
    }
    public function decrypt(string $value, string $context): array {
        $raw = base64_decode($value, true);
        if ($raw === false || strlen($raw) < 29) throw new RuntimeException('Invalid encrypted record');
        $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', base64_decode($this->config['encryption_key']),
            OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16), $context);
        if ($plain === false) throw new RuntimeException('Cannot decrypt record');
        return json_decode($plain, true, 128, JSON_THROW_ON_ERROR);
    }
    private function limit(string $key, int $max, int $seconds = 900): void {
        $bucket = hash('sha256', $key . ':' . intdiv(time(), $seconds));
        try { $this->run('INSERT INTO account_limits (bucket,hits,expires) VALUES (?,0,?)', [$bucket, time()+$seconds]); }
        catch (\PDOException $e) { if (!in_array((string)$e->getCode(), ['23000','23505'], true)) throw $e; }
        $this->run('UPDATE account_limits SET hits=hits+1 WHERE bucket=?', [$bucket]);
        if ((int)$this->one('SELECT hits FROM account_limits WHERE bucket=?', [$bucket])['hits'] > $max)
            $this->fail(429, 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.');
    }
    private function publicUser(array $user): array {
        return ['id'=>$user['id'], 'email'=>$user['email'], 'name'=>$user['name'],
            'googleLinked'=>!empty($user['google_sub']), 'hasPassword'=>!empty($user['password_hash'])];
    }
    private function session(array $user): array {
        $token = bin2hex(random_bytes(32));
        $this->run('INSERT INTO account_sessions (token_hash,user_id,expires) VALUES (?,?,?)',
            [hash('sha256',$token), $user['id'], time()+30*86400]);
        return ['token'=>$token, 'user'=>$this->publicUser($user)];
    }
    private function communityAssertion(array $user): string {
        $secret = base64_decode((string)($this->config['community_federation_secret'] ?? ''), true);
        if ($secret === false || strlen($secret) < 32) $this->fail(503, 'Comunidad todavÃ­a no estÃ¡ disponible.');
        $payload = json_encode([
            'sub'=>$user['id'], 'name'=>$user['name'], 'iss'=>'akhyles-accounts',
            'aud'=>'akhyles-community', 'iat'=>time(), 'exp'=>time()+300,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $body = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
        $signature = hash_hmac('sha256', $body, $secret, true);
        return $body.'.'.rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    }
    private function user(string $token): array {
        $u = $this->one('SELECT u.* FROM account_users u JOIN account_sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?',
            [hash('sha256',$token),time()]);
        if (!$u) $this->fail(401, 'Vuelve a iniciar sesión para sincronizar. Tus datos locales se conservan.');
        return $u;
    }
    /** Minimal identity for first-party features such as Comunidad. */
    public function communityIdentity(string $token): array {
        $u = $this->user($token);
        return ['id'=>$u['id'], 'name'=>$u['name']];
    }
    private function queueMail(string $email, string $subject, string $text, ?string $html = null): void {
        $id = bin2hex(random_bytes(32));
        $this->run('INSERT INTO account_mail (id,email,payload,available,created) VALUES (?,?,?,?,?)',
            [$id, $email, $this->encrypt(['subject'=>$subject,'text'=>$text,'html'=>$html], 'mail:'.$id),time(),time()]);
    }
    private function welcome(array $user): void {
        $this->queueMail($user['email'], 'Bienvenido a Akhyles',
            "Hola ".$user['name'].",\n\nTu cuenta de Akhyles está lista. Abre la app para guardar tu rutina, pesos y entrenamientos en tu dispositivo y sincronizarlos con tu cuenta. En Perfil > Cuenta y copias puedes comprobar cuándo se ha guardado la última copia.\n\nNo weak points.\nEquipo Akhyles\njavi@akhyles.com\n\nEste mensaje corresponde a tu cuenta; no te hemos suscrito a publicidad.");
    }
    private function verificationEmail(string $url): string {
        $safeUrl = htmlspecialchars($url, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        return '<!doctype html><html lang="es"><body style="margin:0;background:#e7e8e2;font-family:Arial,sans-serif;color:#0f1412">'
            .'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px"><tr><td align="center">'
            .'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #d8e3d9;border-radius:20px;overflow:hidden">'
            .'<tr><td style="background:#0f1412;padding:28px 32px;color:#ffffff"><div style="font-size:22px;font-weight:700;letter-spacing:.4px">AKHYLES</div><div style="margin-top:7px;color:#acc0b5;font-size:12px;letter-spacing:1.3px">NO WEAK POINTS</div></td></tr>'
            .'<tr><td style="padding:32px"><h1 style="margin:0 0 12px;font-size:25px;line-height:1.2">Confirma tu cuenta</h1>'
            .'<p style="margin:0 0 24px;color:#52635a;font-size:16px;line-height:1.55">Pulsa el boton para abrir Akhyles y dejar tu cuenta lista.</p>'
            .'<a href="'.$safeUrl.'" style="display:inline-block;background:#21473e;color:#ffffff;text-decoration:none;font-weight:700;padding:15px 22px;border-radius:12px">Confirmar y abrir Akhyles</a>'
            .'<p style="margin:26px 0 0;color:#52635a;font-size:13px;line-height:1.5">El enlace caduca en 15 minutos y solo funciona una vez. Si no has solicitado una cuenta, puedes ignorar este correo.</p>'
            .'</td></tr><tr><td style="padding:18px 32px;background:#f8f8f5;color:#52635a;font-size:12px">Equipo Akhyles · javi@akhyles.com</td></tr>'
            .'</table></td></tr></table></body></html>';
    }
    private function challenge(string $email, string $purpose, array $payload): string {
        $id = bin2hex(random_bytes(32)); $code = (string)random_int(10000000,99999999);
        $this->run('INSERT INTO account_challenges (id,email,purpose,code_hash,payload,expires) VALUES (?,?,?,?,?,?)',
            [$id,$email,$purpose,hash_hmac('sha256',$id.':'.$code,$this->config['encryption_key']),
             $this->encrypt($payload,'challenge:'.$id),time()+900]);
        $subject = $purpose === 'register' ? 'Verifica tu correo de Akhyles' : 'Recupera tu cuenta de Akhyles';
        $url = rtrim((string)($this->config['app_link_url'] ?? 'https://api.akhyles.com/verify'), '/')
            .'?'.http_build_query(['challengeId'=>$id,'code'=>$code], '', '&', PHP_QUERY_RFC3986);
        $text = "Tu código de Akhyles es: $code\n\n";
        if ($purpose === 'register') $text .= "Abre este enlace en tu móvil para confirmar y abrir Akhyles:\n$url\n\n";
        $text .= "Introdúcelo en la app si lo necesitas. Caduca en 15 minutos y solo sirve una vez. Si no lo has solicitado, ignora este correo.\n\nEquipo Akhyles";
        $this->queueMail($email,$subject,$text,$purpose === 'register' ? $this->verificationEmail($url) : null);
        return $id;
    }
    private function consumeChallenge(array $data, string $purpose, callable $action): mixed {
        $id = $this->text($data['challengeId'] ?? null,64);
        $code = $this->text($data['code'] ?? null,8);
        $c = $this->one('SELECT * FROM account_challenges WHERE id=?',[$id]);
        if (!$c || $c['purpose'] !== $purpose || (int)$c['expires'] < time() || (int)$c['attempts'] >= 5)
            $this->fail(400,'Código caducado o no válido. Solicita uno nuevo.');
        $attempt = $this->run('UPDATE account_challenges SET attempts=attempts+1 WHERE id=? AND attempts<5',[$id]);
        if ($attempt->rowCount() !== 1 || !hash_equals($c['code_hash'],hash_hmac('sha256',$id.':'.$code,$this->config['encryption_key'])))
            $this->fail(400,'Código incorrecto. Revisa tu correo.');
        return $this->transaction(function() use ($id,$c,$action) {
            if ($this->run('DELETE FROM account_challenges WHERE id=?',[$id])->rowCount() !== 1)
                $this->fail(400,'Este código ya se ha utilizado.');
            return $action($c,$this->decrypt($c['payload'],'challenge:'.$id));
        });
    }
    private function createUser(string $email, string $name, ?string $password, ?string $sub): array {
        $id = bin2hex(random_bytes(16));
        $this->run('INSERT INTO account_users (id,email,name,password_hash,google_sub,created) VALUES (?,?,?,?,?,?)',
            [$id,$email,$name,$password,$sub,time()]);
        $this->run('INSERT INTO account_progress (user_id,revision,payload,updated) VALUES (?,0,NULL,?)',[$id,gmdate('c')]);
        $u = $this->one('SELECT * FROM account_users WHERE id=?',[$id]); $this->welcome($u); return $u;
    }
    private function google(array $data): array {
        $nonce = $this->text($data['nonce'] ?? null,64);
        if ($this->run('DELETE FROM account_nonces WHERE nonce_hash=? AND expires>?',[hash('sha256',$nonce),time()])->rowCount() !== 1)
            $this->fail(401,'El acceso con Google ha caducado. Vuelve a intentarlo.');
        $credential = $this->text($data['credential'] ?? null,16000);
        try {
            $p = $this->googleVerifier ? ($this->googleVerifier)($credential) :
                (new \Google\Client(['client_id'=>$this->config['google_client_id']]))->verifyIdToken($credential);
        } catch (Throwable) { $p = false; }
        if (!$p || !is_string($p['sub'] ?? null) || strlen($p['sub']) > 255 ||
            ($p['aud'] ?? '') !== $this->config['google_client_id'] ||
            !in_array($p['iss'] ?? '', ['accounts.google.com','https://accounts.google.com'],true) ||
            !is_numeric($p['exp'] ?? null) || (int)$p['exp'] <= time() ||
            !hash_equals($nonce,(string)($p['nonce'] ?? '')) || ($p['email_verified'] ?? false) !== true)
            $this->fail(401,'No se ha podido verificar tu identidad de Google.');
        $p['email'] = $this->email($p['email'] ?? null);
        return $p;
    }
    public function handle(string $method, string $path, array $data = [], string $token = '', string $ip = 'local'): array {
        if ($path === '/health' && $method === 'GET') {
            $this->run('SELECT 1 FROM account_users LIMIT 1');
            return ['service'=>'akhyles-accounts','ok'=>true,'schema'=>1,'googleConfigured'=>!empty($this->config['google_client_id'])];
        }
        if (str_starts_with($path,'/auth/')) $this->limit('auth:'.$ip,40);
        if ($path === '/auth/google/config' && $method === 'GET') {
            if (empty($this->config['google_client_id'])) $this->fail(503,'Google está pendiente de activación. Puedes usar tu correo.');
            $nonce = bin2hex(random_bytes(32));
            $this->run('INSERT INTO account_nonces (nonce_hash,expires) VALUES (?,?)',[hash('sha256',$nonce),time()+300]);
            return ['clientId'=>$this->config['google_client_id'],'nonce'=>$nonce];
        }
        if (in_array($path,['/auth/register','/auth/forgot'],true) && $method === 'POST') {
            $email = $this->email($data['email'] ?? null); $this->limit('email:'.$email,5,3600);
            $id = bin2hex(random_bytes(32));
            $existing = $this->one('SELECT * FROM account_users WHERE email=?',[$email]);
            if ($path === '/auth/register') {
                $password = password_hash($this->password($data['password'] ?? null),PASSWORD_BCRYPT,['cost'=>12]);
                $name = $this->text($data['name'] ?? '',80) ?: 'Atleta';
                if (!$existing) $id = $this->challenge($email,'register',['name'=>$name,'password'=>$password]);
            } elseif ($existing) { $id = $this->challenge($email,'reset',['userId'=>$existing['id']]); }
            return ['challengeId'=>$id,'message'=>'Si el correo corresponde a esta solicitud, recibirás un código. Revisa también spam. Si ya tienes cuenta, inicia sesión o recupera tu contraseña.'];
        }
        if ($path === '/auth/verify' && $method === 'POST') return $this->consumeChallenge($data,'register',function($c,$p) {
            if ($this->one('SELECT id FROM account_users WHERE email=?',[$c['email']])) $this->fail(409,'Ya tienes cuenta. Inicia sesión o recupera tu contraseña.');
            return $this->session($this->createUser($c['email'],$p['name'],$p['password'],null));
        });
        if ($path === '/auth/reset' && $method === 'POST') {
            $password = password_hash($this->password($data['password'] ?? null),PASSWORD_BCRYPT,['cost'=>12]);
            return $this->consumeChallenge($data,'reset',function($c,$p) use ($password) {
                $u = $this->one('SELECT * FROM account_users WHERE id=? AND email=?',[$p['userId'],$c['email']]);
                if (!$u) $this->fail(400,'La cuenta ya no está disponible.');
                $this->run('UPDATE account_users SET password_hash=? WHERE id=?',[$password,$u['id']]);
                $this->run('DELETE FROM account_sessions WHERE user_id=?',[$u['id']]);
                $this->run('DELETE FROM account_challenges WHERE email=?',[$u['email']]);
                return ['ok'=>true];
            });
        }
        if ($path === '/auth/login' && $method === 'POST') {
            $email = $this->email($data['email'] ?? null); $this->limit('login:'.$email,15);
            $pass = $this->password($data['password'] ?? null);
            $u = $this->one('SELECT * FROM account_users WHERE email=?',[$email]);
            $dummy = '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
            if (!password_verify($pass,$u['password_hash'] ?? $dummy) || !$u || !$u['password_hash']) $this->fail(401,'Correo o contraseña incorrectos.');
            return $this->session($u);
        }
        if ($path === '/auth/google' && $method === 'POST') {
            $p = $this->google($data);
            $u = $this->one('SELECT * FROM account_users WHERE google_sub=?',[$p['sub']]);
            if ($u) return $this->session($u);
            if ($this->one('SELECT id FROM account_users WHERE email=?',[$p['email']]))
                $this->fail(409,'Este correo ya tiene cuenta. Entra con tu contraseña y vincula Google desde Cuenta y copias.');
            // For a non-Google-hosted address require mailbox proof too.
            if (!str_ends_with($p['email'],'@gmail.com') && empty($p['hd']))
                $this->fail(400,'Para este correo, crea primero tu cuenta por email y después vincula Google desde Cuenta y copias.');
            return $this->transaction(fn()=> $this->session($this->createUser($p['email'],mb_strcut($p['name'] ?? 'Atleta',0,80,'UTF-8'),null,$p['sub'])));
        }
        $u = $this->user($token); $uid = $u['id']; $this->limit('user:'.$uid,600);
        if ($path === '/me' && $method === 'GET') return $this->publicUser($u);
        if ($path === '/community/session' && $method === 'POST') return ['assertion'=>$this->communityAssertion($u)];
        if ($path === '/auth/google/link' && $method === 'POST') {
            $p = $this->google($data);
            if ($p['email'] !== $u['email']) $this->fail(400,'Elige el Google con el mismo correo que tu cuenta.');
            $existing = $this->one('SELECT id FROM account_users WHERE google_sub=?',[$p['sub']]);
            if ($existing && $existing['id'] !== $uid) $this->fail(409,'Ese Google pertenece a otra cuenta.');
            $this->run('UPDATE account_users SET google_sub=? WHERE id=?',[$p['sub'],$uid]);
            return $this->publicUser($this->one('SELECT * FROM account_users WHERE id=?',[$uid]));
        }
        if ($path === '/auth/logout' && $method === 'POST') {
            $this->run('DELETE FROM account_sessions WHERE token_hash=?',[hash('sha256',$token)]); return ['ok'=>true];
        }
        if ($path === '/me' && $method === 'DELETE') {
            if (($data['confirmEmail'] ?? '') !== $u['email']) $this->fail(400,'Escribe tu correo para confirmar el borrado.');
            return $this->transaction(function() use ($uid,$u) {
                $this->run('DELETE FROM account_challenges WHERE email=?',[$u['email']]);
                $this->run('DELETE FROM account_mail WHERE email=?',[$u['email']]);
                $this->run('DELETE FROM account_users WHERE id=?',[$uid]); return ['ok'=>true];
            });
        }
        if ($path === '/sync' && $method === 'GET') {
            $p = $this->one('SELECT * FROM account_progress WHERE user_id=?',[$uid]);
            return ['revision'=>(int)$p['revision'],'updated'=>$p['updated'],'state'=>$p['payload'] ? $this->normalizeState($this->decrypt($p['payload'],'progress:'.$uid)) : null];
        }
        if ($path === '/sync' && $method === 'PUT') {
            $revision = $data['revision'] ?? null; $state = $data['state'] ?? null;
            if (!is_int($revision) || $revision < 0 || $revision >= 2147483646) $this->fail(400,'Revisión no válida.');
            $this->validateState($state);
            $encoded = $this->encrypt($this->normalizeState($state),'progress:'.$uid); $updated = gmdate('c');
            return $this->transaction(function() use ($uid,$revision,$encoded,$updated) {
                $changed = $this->run('UPDATE account_progress SET revision=revision+1,payload=?,updated=? WHERE user_id=? AND revision=?',[$encoded,$updated,$uid,$revision]);
                if ($changed->rowCount() !== 1) $this->fail(409,'Hay una copia más reciente. Revisa ambas antes de sincronizar.');
                $this->run('INSERT INTO account_versions (user_id,revision,payload,updated) VALUES (?,?,?,?)',[$uid,$revision+1,$encoded,$updated]);
                // Keep the current revision plus the preceding 19 revisions.
                $this->run('DELETE FROM account_versions WHERE user_id=? AND revision<?',[$uid,max(0,$revision-18)]);
                return ['revision'=>$revision+1,'updated'=>$updated];
            });
        }
        if ($path === '/sync/versions' && $method === 'GET')
            return ['versions'=>$this->run('SELECT revision,updated FROM account_versions WHERE user_id=? ORDER BY revision DESC',[$uid])->fetchAll()];
        if (preg_match('#^/sync/versions/([0-9]+)$#',$path,$match) && $method === 'GET') {
            $p = $this->one('SELECT * FROM account_versions WHERE user_id=? AND revision=?',[$uid,(int)$match[1]]);
            if (!$p) $this->fail(404,'Copia no encontrada.');
            return ['revision'=>(int)$p['revision'],'updated'=>$p['updated'],'state'=>$this->normalizeState($this->decrypt($p['payload'],'progress:'.$uid))];
        }
        $this->fail(404,'Ruta no disponible.');
    }
    private function normalizeState(array $s): array {
        // json_decode(..., true) maps both {} and [] to PHP arrays. These fields
        // are dictionaries in the app and MUST serialize back as JSON objects.
        foreach (['names','weights','ranges','notes','loadSteps','barWeights'] as $key)
            if (array_key_exists($key,$s['preferences'])) $s['preferences'][$key]=(object)$s['preferences'][$key];
        if (isset($s['volumeTargets'])) $s['volumeTargets']=(object)$s['volumeTargets'];
        foreach (['drafts','barWeights','loadModes'] as $key)
            if (isset($s['active'][$key])) $s['active'][$key]=(object)$s['active'][$key];
        return $s;
    }
    private function finite(mixed $value, float $min, float $max): bool {
        return (is_int($value) || is_float($value)) && is_finite((float)$value) && $value >= $min && $value <= $max;
    }
    private function validRange(mixed $value): bool {
        return is_array($value) && array_is_list($value) && count($value) === 2 &&
            $this->finite($value[0], 1, 30) && $this->finite($value[1], 1, 30) && $value[0] <= $value[1];
    }
    private function validPrescription(mixed $value): bool {
        return is_array($value) && is_string($value['id'] ?? null) && strlen($value['id']) <= 160 &&
            is_string($value['exerciseId'] ?? null) && strlen($value['exerciseId']) <= 160 &&
            is_int($value['sets'] ?? null) && $value['sets'] >= 1 && $value['sets'] <= 6 &&
            $this->validRange($value['range'] ?? null) && $this->finite($value['weight'] ?? null, 0, 1000);
    }
    private function validRecord(mixed $value): bool {
        if (!is_array($value) || !$this->validPrescription($value['prescription'] ?? null) ||
            !is_string($value['name'] ?? null) || strlen($value['name']) > 160 ||
            !in_array($value['type'] ?? null, ['compound','isolation'], true) || !is_array($value['sets'] ?? null) ||
            !array_is_list($value['sets']) || count($value['sets']) > 6) return false;
        if (isset($value['barWeight']) && !$this->finite($value['barWeight'], 0, 100)) return false;
        foreach ($value['sets'] as $set)
            if (!is_array($set) || !$this->finite($set['weight'] ?? null, 0, 1000) ||
                !is_int($set['reps'] ?? null) || $set['reps'] < 1 || $set['reps'] > 100) return false;
        return true;
    }
    private function validDraft(mixed $value): bool {
        if (!is_array($value) || !array_is_list($value) || count($value) > 6) return false;
        foreach ($value as $set)
            if (!is_array($set) || !is_string($set['weight'] ?? null) || strlen($set['weight']) > 32 ||
                !is_string($set['reps'] ?? null) || strlen($set['reps']) > 32) return false;
        return true;
    }
    private function all(array $items, callable $check): bool {
        foreach ($items as $item) if (!$check($item)) return false;
        return true;
    }
    private function validateState(mixed $s): void {
        if (!is_array($s) || ($s['version'] ?? null) !== 1 || !is_array($s['profile'] ?? null) || !is_array($s['preferences'] ?? null)
            || !is_array($s['routine'] ?? null) || !array_is_list($s['routine']) || !is_array($s['history'] ?? null) || !array_is_list($s['history'])
            || !is_bool($s['completed'] ?? null) || !in_array($s['theme'] ?? null,['system','light','dark'],true))
            $this->fail(400,'La copia no tiene un formato válido.');
        $allowed = ['version','programRevision','profile','preferences','onboardingStep','completed','theme','volumeTargets','routine','routineVersions','history','plannedWorkouts','skippedWorkoutDates','active','bodyWeights','achievements'];
        if (array_diff(array_keys($s),$allowed)) $this->fail(400,'La copia contiene campos de dispositivo o sesión.');
        if (strlen(json_encode($s,JSON_THROW_ON_ERROR)) > 4_000_000 || count($s['history']) > 20000 || count($s['routine']) > 30)
            $this->fail(413,'La copia supera el tamaño permitido. Tus datos permanecen guardados en el dispositivo.');
        if (!is_int($s['onboardingStep'] ?? null) || $s['onboardingStep'] < 0 || $s['onboardingStep'] > 3)
            $this->fail(400,'El estado inicial de la copia no es válido.');
        if (isset($s['achievements'])) {
            if (!is_array($s['achievements']) || !array_is_list($s['achievements']) || count($s['achievements']) > 500)
                $this->fail(400,'Los logros de la copia no tienen un formato válido.');
            foreach ($s['achievements'] as $achievement)
                if (!is_array($achievement) || !is_string($achievement['id'] ?? null) || strlen($achievement['id']) > 120 ||
                    !is_string($achievement['title'] ?? null) || strlen($achievement['title']) > 160 ||
                    !is_string($achievement['description'] ?? null) || strlen($achievement['description']) > 300 ||
                    !is_string($achievement['unlockedAt'] ?? null) || strtotime($achievement['unlockedAt']) === false ||
                    !in_array($achievement['category'] ?? null, ['progress','consistency','strength'], true))
                    $this->fail(400,'Los logros de la copia no tienen un formato válido.');
        }
        foreach ($s['routine'] as $day) {
            if (!is_array($day) || !is_string($day['id'] ?? null) || strlen($day['id']) > 160 ||
                !is_string($day['name'] ?? null) || strlen($day['name']) > 120 ||
                !is_array($day['exercises'] ?? null) || !array_is_list($day['exercises']) || count($day['exercises']) > 100 ||
                !$this->all($day['exercises'], fn($exercise) => $this->validPrescription($exercise)))
                $this->fail(400,'La rutina de la copia no es válida.');
        }
        $ids = [];
        foreach ($s['history'] as $workout) {
            if (!is_array($workout) || !is_string($workout['id'] ?? null) || strlen($workout['id']) > 160 || isset($ids[$workout['id']]) ||
                !is_array($workout['records'] ?? null) || !array_is_list($workout['records']) || count($workout['records']) > 100 ||
                !$this->all($workout['records'], fn($record) => $this->validRecord($record)))
                $this->fail(400,'Historial de entrenamientos no válido.');
            $ids[$workout['id']] = true;
        }
        if (isset($s['active'])) {
            $active = $s['active'];
            if (!is_array($active) || !is_array($active['day'] ?? null) || !is_string($active['day']['id'] ?? null) ||
                !is_string($active['day']['name'] ?? null) || !is_array($active['day']['exercises'] ?? null) ||
                !array_is_list($active['day']['exercises']) || !count($active['day']['exercises']) ||
                !$this->all($active['day']['exercises'], fn($exercise) => $this->validPrescription($exercise)) ||
                !is_int($active['index'] ?? null) || $active['index'] < 0 || $active['index'] >= count($active['day']['exercises']) ||
                !is_string($active['startedAt'] ?? null) || strtotime($active['startedAt']) === false ||
                !$this->validDraft($active['draft'] ?? null) ||
                !is_array($active['records'] ?? null) || !array_is_list($active['records']) || !$this->all($active['records'], fn($record) => $this->validRecord($record)))
                $this->fail(400,'La sesión activa de la copia no es válida.');
        }
    }
    public function deliverMail(callable $sender, int $max = 10): array {
        $rows = $this->run('SELECT * FROM account_mail WHERE available<=? AND locked_until<? AND attempts<8 ORDER BY created LIMIT '.max(1,min(50,$max)),[time(),time()])->fetchAll();
        $sent=0; $failed=0;
        foreach ($rows as $row) {
            if ($this->run('UPDATE account_mail SET locked_until=?,attempts=attempts+1 WHERE id=? AND locked_until<?',[time()+120,$row['id'],time()])->rowCount() !== 1) continue;
            try {
                $mail = $this->decrypt($row['payload'],'mail:'.$row['id']);
                $sender($row['email'],$mail['subject'],$mail['text'],$mail['html'] ?? null);
                $this->run('DELETE FROM account_mail WHERE id=?',[$row['id']]); $sent++;
            } catch (Throwable) {
                $this->run('UPDATE account_mail SET locked_until=0,available=? WHERE id=?',[time()+min(3600,60*(2**(int)$row['attempts'])),$row['id']]); $failed++;
            }
        }
        return ['sent'=>$sent,'failed'=>$failed];
    }
    public function cleanup(): void {
        foreach (['account_sessions','account_challenges','account_nonces','account_limits'] as $table)
            $this->run("DELETE FROM $table WHERE expires<?",[time()]);
        $this->run('DELETE FROM account_mail WHERE created<?',[time()-7*86400]);
    }
}
