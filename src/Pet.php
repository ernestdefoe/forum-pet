<?php

namespace ErnestDefoe\ForumPet;

use Carbon\Carbon;
use Flarum\Database\AbstractModel;

/**
 * The forum's one pet (row 1): how far it has grown and when each stage
 * arrived, and the last post-count milestone it cheered. Everything about
 * how it looks lives in settings; its mood is worked out from activity.
 *
 * @property int $id
 * @property int $stage 0 egg, 1 baby, 2 adult, 3 special
 * @property int $care_total feeds and plays since it was born
 * @property Carbon $born_at
 * @property Carbon|null $hatched_at
 * @property Carbon|null $grown_at
 * @property Carbon|null $ascended_at
 * @property int $milestone
 * @property Carbon|null $milestone_at
 */
class Pet extends AbstractModel
{
    public const EGG = 0;
    public const BABY = 1;
    public const ADULT = 2;
    public const SPECIAL = 3;

    /** The column that records the day each stage arrived. */
    public const STAGE_DATES = [1 => 'hatched_at', 2 => 'grown_at', 3 => 'ascended_at'];

    protected $table = 'forum_pet';

    public $timestamps = false;

    protected $casts = [
        'stage' => 'integer',
        'care_total' => 'integer',
        'milestone' => 'integer',
        'born_at' => 'datetime',
        'hatched_at' => 'datetime',
        'grown_at' => 'datetime',
        'ascended_at' => 'datetime',
        'milestone_at' => 'datetime',
    ];

    /** The pet, made on first use if the row is missing (a hand-emptied table). */
    public static function current(): self
    {
        $pet = self::query()->find(1);

        if (! $pet) {
            $pet = new self();
            $pet->id = 1;
            $pet->stage = self::EGG;
            $pet->care_total = 0;
            $pet->milestone = 0;
            $pet->born_at = Carbon::now();
            try {
                $pet->save();
            } catch (\Illuminate\Database\QueryException) {
                $pet = self::query()->findOrFail(1);
            }
        }

        return $pet;
    }

    public function evolvedAt(): ?Carbon
    {
        return $this->stage > self::EGG ? $this->{self::STAGE_DATES[$this->stage]} : null;
    }
}
