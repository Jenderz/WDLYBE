<?php
/**
 * Dashboard Controller - KPIs and statistics
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleDashboard(string $method, ?string $action = null) {
    $auth = requireRole(['Admin', 'Supervisor']);
    $db = getDB();

    if ($method !== 'GET') jsonError('Método no permitido', 405);

    $weekId = $_GET['week_id'] ?? null;

    // Sales stats
    $salesWhere = $weekId ? "WHERE week_id = ?" : "";
    $salesParams = $weekId ? [$weekId] : [];

    $stmt = $db->prepare("SELECT 
        COALESCE(SUM(amount), 0) as total_sales,
        COALESCE(SUM(prize), 0) as total_prizes,
        COALESCE(SUM(commission), 0) as total_commissions,
        COALESCE(SUM(total), 0) as total_net,
        COALESCE(SUM(participation), 0) as total_participation,
        COALESCE(SUM(total_vendor), 0) as total_vendor,
        COALESCE(SUM(total_bank), 0) as total_bank,
        COUNT(*) as sale_count
        FROM sales $salesWhere");
    $stmt->execute($salesParams);
    $salesStats = $stmt->fetch();

    // Payments stats
    $payWhere = $weekId ? "WHERE week_id = ?" : "";
    $payParams = $weekId ? [$weekId] : [];

    $stmt = $db->prepare("SELECT 
        COALESCE(SUM(CASE WHEN status = 'approved' AND type = 'payment' THEN amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'approved' AND type = 'credit' THEN amount ELSE 0 END), 0) as total_credits,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
        FROM payments $payWhere");
    $stmt->execute($payParams);
    $payStats = $stmt->fetch();

    // Expenses stats (current month if no weekId)
    $expWhere = "WHERE expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as expense_count FROM expenses $expWhere");
    $stmt->execute();
    $expStats = $stmt->fetch();

    // Active sellers count
    $sellerCount = $db->query("SELECT COUNT(*) FROM sellers")->fetchColumn();

    jsonSuccess([
        'sales' => $salesStats,
        'payments' => $payStats,
        'expenses' => $expStats,
        'sellerCount' => (int)$sellerCount,
    ]);
}
