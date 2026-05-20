<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;


class TimeTable extends AbstractController
{
    #[Route('/timetable', name : 'timeTable')]
    public function timetable(): Response{
        return $this->render('TimeTable/timetable.html.twig');
    }
}
