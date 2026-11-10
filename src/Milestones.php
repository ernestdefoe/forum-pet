<?php

namespace ErnestDefoe\ForumPet;

use Carbon\Carbon;
use Flarum\Post\Event\Posted;
use Flarum\Post\Post;
use Illuminate\Contracts\Cache\Repository as Cache;

/**
 * The pet cheers when the forum's post count passes a round number.
 *
 * Counting every post on every post would be a table scan per reply, so the
 * next milestone is kept in the cache and compared with the new post's id
 * first: the count can only have reached N once some post id has (ids only
 * grow, and deleted posts make the count lag behind them). Only then is the
 * real count taken, at most once a minute, and the conditional UPDATE lets
 * exactly one request record the milestone.
 */
class Milestones
{
    private const NEXT = 'ernestdefoe-forum-pet.milestone.next';
    private const CHECKED = 'ernestdefoe-forum-pet.milestone.checked';

    private const STEPS = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

    public function __construct(private readonly Cache $cache, private readonly State $state)
    {
    }

    /** The largest milestone at or below a count (0 below the first). */
    public static function reached(int $count): int
    {
        if ($count >= 1000000) {
            return intdiv($count, 1000000) * 1000000;
        }

        $reached = 0;
        foreach (self::STEPS as $step) {
            if ($count >= $step) {
                $reached = $step;
            }
        }

        return $reached;
    }

    /** The first milestone above one already celebrated. */
    public static function next(int $after): int
    {
        foreach (self::STEPS as $step) {
            if ($step > $after) {
                return $step;
            }
        }

        return (intdiv($after, 1000000) + 1) * 1000000;
    }

    public function handle(Posted $event): void
    {
        $post = $event->post;
        if ($post->type !== 'comment') {
            return;
        }

        $next = $this->cache->get(self::NEXT);
        if (! is_int($next)) {
            $next = self::next((int) Pet::query()->whereKey(1)->value('milestone'));
            $this->cache->put(self::NEXT, $next, 86400);
        }

        if ($post->id < $next || ! $this->cache->add(self::CHECKED, 1, 60)) {
            return;
        }

        $count = self::countPosts();
        $reached = self::reached($count);
        if ($reached < $next) {
            return;
        }

        $won = Pet::query()->whereKey(1)->where('milestone', '<', $reached)
            ->update(['milestone' => $reached, 'milestone_at' => Carbon::now()]);

        $this->cache->put(self::NEXT, self::next($reached), 86400);
        if ($won) {
            $this->state->forget();
        }
    }

    /** Posts anyone can count: comments that are neither hidden nor private. */
    public static function countPosts(): int
    {
        return Post::query()->where('type', 'comment')->whereNull('hidden_at')->where('is_private', false)->count();
    }

    /** After a reset or a hand edit. */
    public function forget(): void
    {
        $this->cache->forget(self::NEXT);
    }
}
