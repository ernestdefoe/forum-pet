<?php

namespace ErnestDefoe\ForumPet;

use Carbon\Carbon;
use Flarum\Post\Event\Posted;
use Flarum\Post\Post;
use Illuminate\Contracts\Cache\Repository as Cache;

/**
 * The pet cheers when the forum's post count passes a round number.
 *
 * Counting every post on every post would be a table scan per reply. But a
 * new post adds at most one to the count, so after a count of C with the
 * next milestone at N, nothing can be reached until N - C more post ids have
 * gone by. The last count and the post id it was taken at are cached; only
 * a post far enough past them counts again. That is exact (no cheer waits
 * for a timer on a quiet forum), and a busy forum counts rarely. The
 * conditional UPDATE lets exactly one request record the milestone.
 */
class Milestones
{
    private const NEXT = 'ernestdefoe-forum-pet.milestone.next';
    private const LAST = 'ernestdefoe-forum-pet.milestone.last';

    private const STEPS = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

    private static ?bool $approval = null;

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
            $this->cache->forever(self::NEXT, $next);
        }

        // [post id, count then]: until N - count more ids have gone by, the count can't be N.
        $last = $this->cache->get(self::LAST);
        if ($post->id < $next || (is_array($last) && $post->id - $last[0] < $next - $last[1])) {
            return;
        }

        $count = self::countPosts();
        $this->cache->forever(self::LAST, [$post->id, $count]);

        $reached = self::reached($count);
        if ($reached < $next) {
            return;
        }

        $won = Pet::query()->whereKey(1)->where('milestone', '<', $reached)
            ->update(['milestone' => $reached, 'milestone_at' => Carbon::now()]);

        $this->cache->forever(self::NEXT, self::next($reached));
        if ($won) {
            $this->state->forget();
        }
    }

    /**
     * Posts anyone can count: comments that are neither hidden nor private,
     * nor (with flarum/approval) waiting for approval.
     */
    public static function countPosts(): int
    {
        $query = Post::query()->where('type', 'comment')->whereNull('hidden_at')->where('is_private', false);

        self::$approval ??= Post::query()->getConnection()->getSchemaBuilder()->hasColumn('posts', 'is_approved');
        if (self::$approval) {
            $query->where('is_approved', true);
        }

        return $query->count();
    }

    /** After a reset or a hand edit. */
    public function forget(): void
    {
        $this->cache->forget(self::NEXT);
        $this->cache->forget(self::LAST);
    }
}
