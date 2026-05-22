<?php

namespace App\Controller;

use App\Service\TaskApiService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class TaskApiController extends AbstractController
{
    public function __construct(
        private readonly TaskApiService $taskApiService,
    ) {
    }

    #[Route('/api/tasks', name: 'api_tasks', methods: ['GET', 'POST', 'PUT', 'DELETE'])]
    public function api(Request $request): JsonResponse
    {
        $session = $request->getSession();

        try {
            $result = $this->taskApiService->handle($request, $session);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['success' => false, 'error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        if (!$result['success']) {
            return $this->json(
                ['success' => false, 'error' => $result['error']],
                $result['status'] ?? Response::HTTP_BAD_REQUEST,
            );
        }

        $data = $result['data'] ?? [];

        return $this->json(array_merge(['success' => true], $data));
    }
}
