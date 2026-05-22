<?php

namespace App\Service;

use App\Entity\Task;
use App\Repository\TaskRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Session\SessionInterface;

class TaskApiService
{
    private const DEMO_KEY = 'tasks_demo';
    private const DEMO_NEXT_ID_KEY = 'tasks_demo_next_id';

    public function __construct(
        private readonly TaskRepository $taskRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function isLoggedIn(SessionInterface $session): bool
    {
        return $session->get('user_id') !== null;
    }

    public function getUserId(SessionInterface $session): ?int
    {
        $userId = $session->get('user_id');

        return $userId !== null ? (int) $userId : null;
    }

    /** @return array{success: true}|array{success: false, error: string, status: int} */
    public function handle(Request $request, SessionInterface $session): array
    {
        $action = $request->query->getString('action', 'list');
        $method = $request->getMethod();
        $payload = $this->decodePayload($request);

        $userId = $this->getUserId($session);
        $demoMode = $userId === null;

        if ($demoMode) {
            return $this->handleDemo($session, $action, $method, $payload, $request);
        }

        try {
            return $this->handleDatabase($userId, $action, $method, $payload, $request);
        } catch (\Throwable) {
            return ['success' => false, 'error' => 'Erreur de base de données.', 'status' => 500];
        }
    }

    /** @return array<string, mixed> */
    private function decodePayload(Request $request): array
    {
        $content = $request->getContent();
        if ($content !== '') {
            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return $request->request->all();
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return array{success: true, data?: array<string, mixed>}|array{success: false, error: string, status: int}
     */
    private function handleDemo(SessionInterface $session, string $action, string $method, array $payload, Request $request): array
    {
        /** @var array<int, array<string, mixed>> $list */
        $list = $session->get(self::DEMO_KEY, []);
        if (!is_array($list)) {
            $list = [];
        }
        if (!$session->has(self::DEMO_NEXT_ID_KEY)) {
            $session->set(self::DEMO_NEXT_ID_KEY, 1);
        }

        switch ($action) {
            case 'list':
                return ['success' => true, 'data' => ['tasks' => array_values($list)]];

            case 'create':
                if ($method !== 'POST') {
                    return $this->fail('Méthode non autorisée pour la création.', 405);
                }
                $title = $this->normalizeText((string) ($payload['title'] ?? ''));
                if ($title === '') {
                    return $this->fail('Le titre de la tâche est requis.');
                }
                $id = (int) $session->get(self::DEMO_NEXT_ID_KEY, 1);
                $session->set(self::DEMO_NEXT_ID_KEY, $id + 1);
                $task = [
                    'id' => $id,
                    'title' => $title,
                    'description' => $this->normalizeText((string) ($payload['description'] ?? '')),
                    'priority' => $this->normalizePriority((string) ($payload['priority'] ?? 'Moyenne')),
                    'due_date' => $this->validateDate(isset($payload['due_date']) ? (string) $payload['due_date'] : null),
                    'due_time' => $this->validateTime(isset($payload['due_time']) ? (string) $payload['due_time'] : null),
                    'is_done' => 0,
                    'created_at' => (new \DateTimeImmutable())->format('c'),
                    'updated_at' => null,
                ];
                $list[$id] = $task;
                $session->set(self::DEMO_KEY, $list);

                return ['success' => true, 'data' => ['task_id' => $id]];

            case 'update':
                if (!in_array($method, ['POST', 'PUT'], true)) {
                    return $this->fail('Méthode non autorisée pour la mise à jour.', 405);
                }
                $id = isset($payload['id']) ? (int) $payload['id'] : 0;
                if ($id <= 0 || !isset($list[$id])) {
                    return $this->fail('Tâche introuvable.');
                }
                if (array_key_exists('title', $payload)) {
                    $title = $this->normalizeText((string) $payload['title']);
                    if ($title === '') {
                        return $this->fail('Le titre de la tâche ne peut pas être vide.');
                    }
                    $list[$id]['title'] = $title;
                }
                if (array_key_exists('description', $payload)) {
                    $list[$id]['description'] = $this->normalizeText((string) $payload['description']);
                }
                if (array_key_exists('priority', $payload)) {
                    $list[$id]['priority'] = $this->normalizePriority((string) $payload['priority']);
                }
                if (array_key_exists('due_date', $payload)) {
                    $list[$id]['due_date'] = $this->validateDate(isset($payload['due_date']) ? (string) $payload['due_date'] : null);
                }
                if (array_key_exists('due_time', $payload)) {
                    $list[$id]['due_time'] = $this->validateTime(isset($payload['due_time']) ? (string) $payload['due_time'] : null);
                }
                if (array_key_exists('is_done', $payload)) {
                    $list[$id]['is_done'] = $payload['is_done'] ? 1 : 0;
                }
                $list[$id]['updated_at'] = (new \DateTimeImmutable())->format('c');
                $session->set(self::DEMO_KEY, $list);

                return ['success' => true, 'data' => ['updated' => true]];

            case 'delete':
                if (!in_array($method, ['POST', 'DELETE'], true)) {
                    return $this->fail('Méthode non autorisée pour la suppression.', 405);
                }
                $id = $request->query->getInt('id');
                if ($id <= 0 && isset($payload['id'])) {
                    $id = (int) $payload['id'];
                }
                if ($id <= 0 || !isset($list[$id])) {
                    return $this->fail('Tâche introuvable ou impossibilité de la supprimer.');
                }
                unset($list[$id]);
                $session->set(self::DEMO_KEY, $list);

                return ['success' => true, 'data' => ['deleted' => true]];

            default:
                return $this->fail('Action inconnue.', 404);
        }
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return array{success: true, data?: array<string, mixed>}|array{success: false, error: string, status: int}
     */
    private function handleDatabase(int $userId, string $action, string $method, array $payload, Request $request): array
    {
        switch ($action) {
            case 'list':
                $tasks = $this->taskRepository->findByUserOrdered($userId);

                return [
                    'success' => true,
                    'data' => ['tasks' => array_map(static fn (Task $task) => $task->toArray(), $tasks)],
                ];

            case 'create':
                if ($method !== 'POST') {
                    return $this->fail('Méthode non autorisée pour la création.', 405);
                }
                $title = $this->normalizeText((string) ($payload['title'] ?? ''));
                if ($title === '') {
                    return $this->fail('Le titre de la tâche est requis.');
                }
                $task = new Task();
                $task->setUserId($userId)
                    ->setTitle($title)
                    ->setDescription($this->normalizeText((string) ($payload['description'] ?? '')))
                    ->setPriority($this->normalizePriority((string) ($payload['priority'] ?? 'Moyenne')))
                    ->setDueDate($this->parseDate(isset($payload['due_date']) ? (string) $payload['due_date'] : null))
                    ->setDueTime($this->parseTime(isset($payload['due_time']) ? (string) $payload['due_time'] : null));
                $this->entityManager->persist($task);
                $this->entityManager->flush();

                return ['success' => true, 'data' => ['task_id' => $task->getId()]];

            case 'update':
                if (!in_array($method, ['POST', 'PUT'], true)) {
                    return $this->fail('Méthode non autorisée pour la mise à jour.', 405);
                }
                $id = isset($payload['id']) ? (int) $payload['id'] : 0;
                if ($id <= 0) {
                    return $this->fail('Identifiant de tâche invalide.');
                }
                $task = $this->taskRepository->findOneBy(['id' => $id, 'userId' => $userId]);
                if ($task === null) {
                    return $this->fail('Tâche introuvable.');
                }
                $updated = false;
                if (array_key_exists('title', $payload)) {
                    $title = $this->normalizeText((string) $payload['title']);
                    if ($title === '') {
                        return $this->fail('Le titre de la tâche ne peut pas être vide.');
                    }
                    $task->setTitle($title);
                    $updated = true;
                }
                if (array_key_exists('description', $payload)) {
                    $task->setDescription($this->normalizeText((string) $payload['description']));
                    $updated = true;
                }
                if (array_key_exists('priority', $payload)) {
                    $task->setPriority($this->normalizePriority((string) $payload['priority']));
                    $updated = true;
                }
                if (array_key_exists('due_date', $payload)) {
                    $task->setDueDate($this->parseDate(isset($payload['due_date']) ? (string) $payload['due_date'] : null));
                    $updated = true;
                }
                if (array_key_exists('due_time', $payload)) {
                    $task->setDueTime($this->parseTime(isset($payload['due_time']) ? (string) $payload['due_time'] : null));
                    $updated = true;
                }
                if (array_key_exists('is_done', $payload)) {
                    $task->setIsDone((bool) $payload['is_done']);
                    $updated = true;
                }
                if (!$updated) {
                    return $this->fail('Aucune donnée à mettre à jour.');
                }
                $task->touch();
                $this->entityManager->flush();

                return ['success' => true, 'data' => ['updated' => true]];

            case 'delete':
                if (!in_array($method, ['POST', 'DELETE'], true)) {
                    return $this->fail('Méthode non autorisée pour la suppression.', 405);
                }
                $id = $request->query->getInt('id');
                if ($id <= 0 && isset($payload['id'])) {
                    $id = (int) $payload['id'];
                }
                if ($id <= 0) {
                    return $this->fail('Identifiant de tâche invalide.');
                }
                $task = $this->taskRepository->findOneBy(['id' => $id, 'userId' => $userId]);
                if ($task === null) {
                    return $this->fail('Tâche introuvable ou impossibilité de la supprimer.');
                }
                $this->entityManager->remove($task);
                $this->entityManager->flush();

                return ['success' => true, 'data' => ['deleted' => true]];

            default:
                return $this->fail('Action inconnue.', 404);
        }
    }

    /** @return array{success: false, error: string, status: int} */
    private function fail(string $message, int $status = 400): array
    {
        return ['success' => false, 'error' => $message, 'status' => $status];
    }

    private function normalizeText(string $value): string
    {
        return trim($value);
    }

    private function normalizePriority(string $priority): string
    {
        return in_array($priority, Task::PRIORITIES, true) ? $priority : 'Moyenne';
    }

    private function validateDate(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            throw new \InvalidArgumentException('Format de date invalide.');
        }

        return $value;
    }

    private function validateTime(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!preg_match('/^\d{2}:\d{2}$/', $value)) {
            throw new \InvalidArgumentException('Format d’heure invalide.');
        }

        return $value;
    }

    private function parseDate(?string $value): ?\DateTimeInterface
    {
        $validated = $this->validateDate($value);

        return $validated !== null ? new \DateTimeImmutable($validated) : null;
    }

    private function parseTime(?string $value): ?\DateTimeInterface
    {
        $validated = $this->validateTime($value);

        return $validated !== null ? new \DateTimeImmutable('1970-01-01 '.$validated) : null;
    }
}
