<?php

namespace ErnestDefoe\ForumPet;

use Carbon\Carbon;
use Flarum\Database\AbstractModel;
use Flarum\User\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One member feeding or playing with the pet on one day. The unique key
 * (user_id, day, kind) is what makes it once a day: a second tap, or two
 * at once, cannot add a second row.
 *
 * @property int $id
 * @property int $user_id
 * @property string $day Y-m-d in the forum's pet timezone
 * @property string $kind feed | play
 * @property Carbon $created_at
 * @property User|null $user
 */
class Care extends AbstractModel
{
    protected $table = 'forum_pet_care';

    public $timestamps = false;

    protected $casts = ['created_at' => 'datetime'];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
