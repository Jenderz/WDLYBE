<?php
/**
 * Payment Model
 */
require_once __DIR__ . '/../config/database.php';

class Payment {
    public static function getAll(array $filters = []): array {
        $db = getDB();
        $where = [];
        $params = [];

        if (!empty($filters['week_id'])) {
            $where[] = "p.week_id = ?";
            $params[] = $filters['week_id'];
        }
        if (!empty($filters['seller_id'])) {
            $where[] = "p.seller_id = ?";
            $params[] = $filters['seller_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = "p.status = ?";
            $params[] = $filters['status'];
        }
        if (!empty($filters['user_id'])) {
            $where[] = "p.user_id = ?";
            $params[] = $filters['user_id'];
        }

        $sql = "SELECT p.*, u.name as vendor_name, sl.name as seller_name 
                FROM payments p 
                LEFT JOIN users u ON p.user_id = u.id 
                LEFT JOIN sellers sl ON p.seller_id = sl.id";

        if (!empty($where)) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        $sql .= " ORDER BY p.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function findById(int $id): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT p.*, u.name as vendor_name, sl.name as seller_name 
            FROM payments p 
            LEFT JOIN users u ON p.user_id = u.id 
            LEFT JOIN sellers sl ON p.seller_id = sl.id 
            WHERE p.id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function create(array $data): int {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO payments 
            (user_id, seller_id, week_label, week_id, amount, currency, bank, method, reference, payment_date, status, type, proof_image_path, admin_note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['user_id'],
            $data['seller_id'],
            $data['week_label'],
            $data['week_id'],
            abs(floatval($data['amount'])),
            $data['currency'],
            $data['bank'],
            $data['method'],
            $data['reference'],
            $data['payment_date'],
            $data['status'] ?? 'pending',
            $data['type'] ?? 'payment',
            $data['proof_image_path'] ?? null,
            $data['admin_note'] ?? null,
        ]);
        return (int) $db->lastInsertId();
    }

    public static function updateStatus(int $id, string $status, ?string $adminNote = null): bool {
        $db = getDB();
        $payment = self::findById($id);
        if (!$payment) return false;

        $oldStatus = $payment['status'];
        $sql = "UPDATE payments SET status = ?, updated_at = NOW()";
        $params = [$status];
        if ($adminNote !== null) {
            $sql .= ", admin_note = ?";
            $params[] = $adminNote;
        }
        $sql .= " WHERE id = ?";
        $params[] = $id;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        // Update weekly ticket if payment type != credit
        if ($payment['type'] !== 'credit') {
            if ($oldStatus !== 'approved' && $status === 'approved') {
                self::applyToWeeklyTicket($payment, false);
            } elseif ($oldStatus === 'approved' && $status !== 'approved') {
                self::applyToWeeklyTicket($payment, true);
            }
        }

        return true;
    }

    /**
     * Apply payment amount to weekly ticket totals
     */
    private static function applyToWeeklyTicket(array $payment, bool $reverse = false): void {
        $db = getDB();
        $amount = $reverse ? -abs($payment['amount']) : abs($payment['amount']);

        // Find existing ticket
        $stmt = $db->prepare("SELECT * FROM weekly_tickets WHERE seller_id = ? AND week_id = ? AND currency = ?");
        $stmt->execute([$payment['seller_id'], $payment['week_id'], $payment['currency']]);
        $ticket = $stmt->fetch();

        if ($ticket) {
            $newPaid = round($ticket['total_paid'] + $amount, 2);
            $newBalance = round($ticket['total_bank'] - $newPaid, 2);
            $stmt = $db->prepare("UPDATE weekly_tickets SET total_paid = ?, balance = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$newPaid, $newBalance, $ticket['id']]);
        } elseif (!$reverse) {
            // Create new ticket entry
            $vendorName = '';
            $stmtS = $db->prepare("SELECT name FROM sellers WHERE id = ?");
            $stmtS->execute([$payment['seller_id']]);
            $seller = $stmtS->fetch();
            if ($seller) $vendorName = $seller['name'];

            $stmt = $db->prepare("INSERT INTO weekly_tickets 
                (seller_id, week_id, week_label, total_sales, total_prize, total_commission, total_net, total_participation, total_vendor, total_bank, total_paid, balance, currency, status)
                VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?, 'open')");
            $stmt->execute([
                $payment['seller_id'],
                $payment['week_id'],
                $payment['week_label'],
                round($amount, 2),
                round(-$amount, 2),
                $payment['currency'],
            ]);
        }
    }

    public static function getByVendor(int $sellerId): array {
        return self::getAll(['seller_id' => $sellerId]);
    }
}
