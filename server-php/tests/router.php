<?php
declare(strict_types=1);
// Local browser QA only. This file is never part of the public deployment.
if (PHP_SAPI !== 'cli-server' || !in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1','::1'],true)) {http_response_code(404);exit;}
require __DIR__.'/fixture.php';
$path=dirname(__DIR__,2).'/test-results/account-qa.sqlite';
$db=new PDO('sqlite:'.$path);fixtureSchema($db);
$app=new \Akhyles\Accounts($db,fixtureConfig());
header('Content-Type: application/json');header('Access-Control-Allow-Origin: http://localhost:8093');header('Access-Control-Allow-Headers: Authorization, Content-Type');header('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
if($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}
$route=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
try{
 if($route==='/test/mail'){
   $rows=[];$app->deliverMail(function($email,$subject,$text)use(&$rows){$rows[]=compact('email','subject','text');},50);echo json_encode($rows);exit;
 }
 $data=json_decode(file_get_contents('php://input'),true)??[];
 $token=preg_replace('/^Bearer /','',$_SERVER['HTTP_AUTHORIZATION']??'');
 echo json_encode($app->handle($_SERVER['REQUEST_METHOD'],$route,$data,$token,'local-test-'.bin2hex(random_bytes(8))));
}catch(\Akhyles\ApiError $e){http_response_code($e->status);echo json_encode(['error'=>$e->getMessage()]);}
