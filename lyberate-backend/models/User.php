<?php
/**
 * User Model
 */
require_once __DIR__ . '/../config/database.php';

class User {
    public static function findByEmail(string $email): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch() ?: null;
    }

    public static function findById(int $id): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, name, email, role, seller_id, agency_name, created_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public static function getAll(): array {
        $db = getDB();
        $stmt = $db->query("SELECT id, name, email, role, seller_id, agency_name, created_at FROM users ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public static function create(array $data): int {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO users (name, email, password_hash, role, seller_id, agency_name) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['name'],
            $data['email'],
            password_hash($data['password'], PASSWORD_BCRYPT),
            $data['role'] ?? 'Vendedor',
            $data['seller_id'] ?? null,
            $data['agency_name'] ?? null,
        ]);
        return (int) $db->lastInsertId();
    }

    public static function update(int $id, array $data): bool {
        $db = getDB();
        $fields = [];
        $values = [];

        foreach (['name', 'email', 'role', 'seller_id', 'agency_name'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "$col = ?";
                $values[] = $data[$col];
            }
        }

        if (isset($data['password']) && !empty($data['password'])) {
            $fields[] = "password_hash = ?";
            $values[] = password_hash($data['password'], PASSWORD_BCRYPT);
        }

        if (empty($fields)) return false;
        $values[] = $id;
        $stmt = $db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($values);
    }

    public static function delete(int $id): bool {
        $db = getDB();
        // Prevent deleting last admin
        $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if ($user && $user['role'] === 'Admin') {
            $count = $db->query("SELECT COUNT(*) FROM users WHERE role = 'Admin'")->fetchColumn();
            if ($count <= 1) return false;
        }
        $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public static function findBySellerId(int $sellerId): ?array {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, name, email, role, seller_id, agency_name FROM users WHERE seller_id = ?");
        $stmt->execute([$sellerId]);
        return $stmt->fetch() ?: null;
    }

    public static function deleteBySellerId(int $sellerId): bool {
        $db = getDB();
        $stmt = $db->prepare("DELETE FROM users WHERE seller_id = ?");
        return $stmt->execute([$sellerId]);
    }
}
