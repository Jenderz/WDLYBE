<?php
/**
 * Users Controller
 */
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/Response.php';

function handleUsers(string $method, ?string $id = null) {
    $auth = requireRole(['Admin', 'Supervisor']);

    switch ($method) {
        case 'GET':
            if ($id) {
                $user = User::findById((int)$id);
                if (!$user) jsonError('Usuario no encontrado', 404);
                jsonSuccess($user);
            }
            jsonSuccess(User::getAll());
            break;

        case 'POST':
            $data = getJsonBody();
            if ($auth['role'] === 'Supervisor' && isset($data['role']) && in_array($data['role'], ['Admin', 'Supervisor'])) {
                jsonError('No tienes permisos para crear usuarios con este rol', 403);
            }
            $err = validateRequired($data, ['name', 'email', 'password', 'role']);
            if ($err) jsonError($err);

            // Check duplicate email
            if (User::findByEmail($data['email'])) {
                jsonError('Ya existe un usuario con ese email');
            }

            $newId = User::create($data);
            $user = User::findById($newId);
            jsonSuccess($user, 'Usuario creado', 201);
            break;

        case 'PUT':
            if (!$id) jsonError('ID requerido');
            $data = getJsonBody();
            if ($auth['role'] === 'Supervisor') {
                $t = User::findById((int)$id);
                if ($t && in_array($t['role'], ['Admin', 'Supervisor']) && (int)$id !== (int)$auth['id']) {
                    jsonError('No tienes permisos para editar este usuario', 403);
                }
                if (isset($data['role']) && in_array($data['role'], ['Admin', 'Supervisor']) && (int)$id !== (int)$auth['id']) {
                    jsonError('No tienes permisos para asignar este rol', 403);
                }
            }
            User::update((int)$id, $data);
            $user = User::findById((int)$id);
            jsonSuccess($user, 'Usuario actualizado');
            break;

        case 'DELETE':
            if (!$id) jsonError('ID requerido');
            if ($auth['role'] === 'Supervisor') {
                $t = User::findById((int)$id);
                if ($t && in_array($t['role'], ['Admin', 'Supervisor'])) {
                    jsonError('No tienes permisos para eliminar este usuario', 403);
                }
            }
            $result = User::delete((int)$id);
            if (!$result) jsonError('No se puede eliminar al último administrador');
            jsonSuccess(null, 'Usuario eliminado');
            break;

        default:
            jsonError('Método no permitido', 405);
    }
}
