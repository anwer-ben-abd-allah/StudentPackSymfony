<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class PomodoroController extends AbstractController
{
    #[Route('/pomodoro', name: 'app_pomodoro')]
    public function pomodoro(): Response
    {
        return $this->render('pomodoro/pomodoro.html.twig');
    }
}
