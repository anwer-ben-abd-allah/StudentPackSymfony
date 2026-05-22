<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class UpcomingExamsController extends AbstractController
{
    #[Route('/upcoming-exams', name: 'upcoming_exams')]
    public function index(): Response
    {
        return $this->render('upcoming_exams/index.html.twig');
    }
}
