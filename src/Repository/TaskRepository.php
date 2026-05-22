<?php

namespace App\Repository;

use App\Entity\Task;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Task>
 */
class TaskRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Task::class);
    }

    /** @return Task[] */
    public function findByUserOrdered(int $userId): array
    {
        $tasks = $this->createQueryBuilder('t')
            ->andWhere('t.userId = :userId')
            ->setParameter('userId', $userId)
            ->getQuery()
            ->getResult();

        usort($tasks, static function (Task $a, Task $b): int {
            if ($a->isDone() !== $b->isDone()) {
                return $a->isDone() <=> $b->isDone();
            }

            $aDate = $a->getDueDate();
            $bDate = $b->getDueDate();
            if ($aDate === null && $bDate !== null) {
                return 1;
            }
            if ($aDate !== null && $bDate === null) {
                return -1;
            }
            if ($aDate !== null && $bDate !== null) {
                $dateCmp = $aDate <=> $bDate;
                if ($dateCmp !== 0) {
                    return $dateCmp;
                }
                $aTime = $a->getDueTime()?->format('H:i') ?? '';
                $bTime = $b->getDueTime()?->format('H:i') ?? '';
                $timeCmp = $aTime <=> $bTime;
                if ($timeCmp !== 0) {
                    return $timeCmp;
                }
            }

            $priorities = Task::PRIORITIES;
            $aIdx = array_search($a->getPriority(), $priorities, true);
            $bIdx = array_search($b->getPriority(), $priorities, true);

            return ($aIdx === false ? 99 : $aIdx) <=> ($bIdx === false ? 99 : $bIdx);
        });

        return $tasks;
    }
}
