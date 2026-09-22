<?php
declare(strict_types=1);
namespace Akhyles;
use PDO;
use RuntimeException;
use Throwable;

final class Backup {
    private const TABLES_V1=['account_users','account_progress','account_versions'];
    private const TABLES_V2=['account_users','account_progress','account_versions','account_sync_meta','account_sync_entities','account_sync_changes','account_sync_operations','account_operational_metrics'];
    public static function export(PDO $db,Accounts $app): string {
        $db->beginTransaction();
        try {
            $tables=[];
            foreach(self::TABLES_V2 as $name)$tables[$name]=$db->query("SELECT * FROM $name")->fetchAll(PDO::FETCH_ASSOC);
            $encoded=$app->encrypt(['format'=>2,'created'=>gmdate('c'),'tables'=>$tables],'database-backup');
            $db->commit();return $encoded;
        } catch(Throwable $e){$db->rollBack();throw $e;}
    }
    public static function restore(PDO $db,Accounts $app,string $encrypted): array {
        $backup=$app->decrypt($encrypted,'database-backup');
        $tables=($backup['format']??null)===1 ? self::TABLES_V1 : (($backup['format']??null)===2 ? self::TABLES_V2 : []);
        if(!$tables || array_keys($backup['tables']??[])!==$tables)throw new RuntimeException('Invalid backup format');
        // Restoration is only permitted into an initialized EMPTY database.
        foreach($tables as $table)if((int)$db->query("SELECT COUNT(*) FROM $table")->fetchColumn()!==0)throw new RuntimeException('Restore requires an empty database');
        $db->beginTransaction();
        try {
            $counts=[];
            foreach($tables as $table){
                $rows=$backup['tables'][$table];$counts[$table]=count($rows);
                foreach($rows as $row){
                    $columns=array_keys($row);
                    foreach($columns as $col)if(!preg_match('/^[a-z_]+$/',$col))throw new RuntimeException('Invalid column');
                    $s=$db->prepare("INSERT INTO $table (".implode(',',$columns).') VALUES ('.implode(',',array_fill(0,count($columns),'?')).')');
                    $s->execute(array_values($row));
                }
            }
            $db->commit();return $counts;
        } catch(Throwable $e){$db->rollBack();throw $e;}
    }
}
