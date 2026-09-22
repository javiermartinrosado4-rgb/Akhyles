<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/bootstrap.php';
$row=$db->query("SELECT COUNT(*) AS accounts,COALESCE(SUM(v2_enabled),0) AS enabled,COALESCE(SUM(CASE WHEN migration_verified_at IS NOT NULL THEN 1 ELSE 0 END),0) AS verified FROM account_sync_meta")->fetch(PDO::FETCH_ASSOC);
$entities=(int)$db->query('SELECT COUNT(*) FROM account_sync_entities WHERE deleted=0')->fetchColumn();
$changes=(int)$db->query('SELECT COUNT(*) FROM account_sync_changes')->fetchColumn();
$report=['accounts'=>(int)$row['accounts'],'enabled'=>(int)$row['enabled'],'verified'=>(int)$row['verified'],'entities'=>$entities,'retainedChanges'=>$changes,'generatedAt'=>gmdate('c')];
echo json_encode($report,JSON_UNESCAPED_SLASHES)."\n";
if(in_array('--require-verified',$argv,true) && $report['enabled']!==$report['verified']) exit(2);
