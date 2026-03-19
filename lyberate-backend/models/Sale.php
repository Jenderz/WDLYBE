<?php
/**
 * Sale Model
 */
require_once __DIR__ . '/../config/database.php';

class Sale {
    public static function getAll(array $filters = []): array {
        $db = getDB();
        $where = [];
        $params = [];

        if (!empty($filters['week_id'])) {
            $where[] = "s.week_id = ?";
            $params[] = $filters['week_id'];
        }
        if (!empty($filters['seller_id'])) {
            $where[] = "s.seller_id = ?";
            $params[] = $filters['seller_id'];
        }

        $sql = "SELECT s.*, sl.name as seller_name, a.name as agency_name 
                FROM sales s 
                LEFT JOIN sellers sl ON s.seller_id = sl.id 
                LEFT JOIN agencies a ON s.agency_id = a.id";

        if (!empty($where)) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        $sql .= " ORDER BY s.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function create(array $data): int {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO sales 
            (seller_id, agency_id, product_name, currency_name, amount, prize, commission, total, participation, total_vendor, total_bank, sale_date, week_id, registered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['seller_id'],
            $data['agency_id'] ?? null,
            $data['product_name'],
            $data['currency_name'],
            roundFinance(floatval($data['amount'])),
            roundFinance(floatval($data['prize'] ?? 0)),
            roundFinance(floatval($data['commission'] ?? 0)),
            roundFinance(floatval($data['total'] ?? 0)),
            roundFinance(floatval($data['participation'] ?? 0)),
            roundFinance(floatval($data['total_vendor'] ?? 0)),
            roundFinance(floatval($data['total_bank'] ?? 0)),
            $data['sale_date'],
            $data['week_id'],
            $data['registered_at'] ?? date('Y-m-d H:i:s'),
        ]);
        return (int) $db->lastInsertId();
    }

    public static function createBatch(array $sales): int {
        $db = getDB();
        $count = 0;
        $db->beginTransaction();
        try {
            foreach ($sales as $sale) {
                self::create($sale);
                $count++;
            }
            $db->commit();
        } catch (\Exception $e) {
            $db->rollBack();
            throw $e;
        }
        return $count;
    }

    public static function delete(int $id): bool {
        $db = getDB();
        $stmt = $db->prepare("DELETE FROM sales WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public static function findById(int $id): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT s.*, sl.name as seller_name FROM sales s LEFT JOIN sellers sl ON s.seller_id = sl.id WHERE s.id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }
}
