<?php

namespace ErnestDefoe\ForumPet;

use Carbon\Carbon;
use Flarum\User\User;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\QueryException;

/**
 * Feeding and playing. Each is once per member per day, and the database
 * decides that: the care row's unique key (user, day, kind) refuses a
 * second one, however many taps arrive at once. The pet's care total only
 * grows in the same transaction as a row that was really added.
 */
class Caretaking
{
    public function __construct(
        private readonly ConnectionInterface $db,
        private readonly Clock $clock,
        private readonly Config $config,
        private readonly State $state,
        private readonly Milestones $milestones,
    ) {
    }

    /**
     * @return array{done: bool, evolved: int|null}
     */
    public function care(User $actor, string $kind): array
    {
        Pet::current();
        $day = $this->clock->today();

        try {
            $this->db->transaction(function () use ($actor, $kind, $day) {
                $care = new Care();
                $care->user_id = $actor->id;
                $care->day = $day;
                $care->kind = $kind;
                $care->created_at = Carbon::now();
                $care->save();

                Pet::query()->whereKey(1)->increment('care_total');
            });
        } catch (QueryException $e) {
            if (Care::query()->where('user_id', $actor->id)->where('day', $day)->where('kind', $kind)->exists()) {
                return ['done' => false, 'evolved' => null];
            }
            throw $e;
        }

        $evolved = $this->grow();
        $this->state->forget();

        return ['done' => true, 'evolved' => $evolved];
    }

    /**
     * Move the pet to the stage its care total has earned. The UPDATE only
     * matches the stage it was read at, so when two caretakers cross the line
     * together exactly one of them is told "you made it evolve".
     */
    public function grow(): ?int
    {
        // A lost race means someone else just moved it, perhaps not as far as the care
        // total now earns (they read it a moment earlier): read again and try once more.
        for ($attempt = 0; $attempt < 2; $attempt++) {
            $pet = Pet::current();
            $target = $this->config->stageFor($pet->care_total);
            if ($target <= $pet->stage) {
                return null;
            }

            $now = Carbon::now();
            $changes = ['stage' => $target];
            for ($stage = $pet->stage + 1; $stage <= $target; $stage++) {
                $changes[Pet::STAGE_DATES[$stage]] = $now;
            }

            if (Pet::query()->whereKey(1)->where('stage', $pet->stage)->update($changes)) {
                return $target;
            }
        }

        return null;
    }

    /** A new egg. Today's care is cleared too, so everyone can welcome it. */
    public function reset(): void
    {
        $pet = Pet::current();
        $pet->stage = Pet::EGG;
        $pet->care_total = 0;
        $pet->born_at = Carbon::now();
        $pet->hatched_at = $pet->grown_at = $pet->ascended_at = null;
        $pet->milestone = Milestones::reached(Milestones::countPosts());
        $pet->milestone_at = null;
        $pet->save();

        Care::query()->where('day', $this->clock->today())->delete();

        $this->milestones->forget();
        $this->state->forget();
    }
}
