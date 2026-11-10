<?php

namespace ErnestDefoe\ForumPet;

use Carbon\Carbon;
use Flarum\Http\SlugManager;
use Flarum\Post\Post;
use Flarum\User\User;
use Illuminate\Contracts\Cache\Repository as Cache;

/**
 * How the pet is doing right now.
 *
 * Everything shared by all visitors (its growth, the forum's activity,
 * today's care and caretakers, today's hat) is one cached array, rebuilt at
 * most once a minute, or at once after someone feeds or plays with it. A
 * page view reads that array and adds only the viewer's own care today: one
 * indexed lookup, for members.
 */
class State
{
    private const TTL = 60;

    /** Caretakers kept with today's state; the sidebar shows the first few. */
    private const LIST = 60;
    private const SIDEBAR = 8;

    private const RECENT_HOURS = 3;

    public function __construct(
        private readonly Cache $cache,
        private readonly Config $config,
        private readonly Clock $clock,
        private readonly Holiday $holiday,
        private readonly SlugManager $slugs,
    ) {
    }

    /** @return array<string, mixed> */
    public function shared(): array
    {
        $day = $this->clock->today();

        return $this->cache->remember($this->key($day), self::TTL, fn () => $this->build($day));
    }

    public function forget(): void
    {
        $this->cache->forget($this->key($this->clock->today()));
    }

    private function key(string $day): string
    {
        return 'ernestdefoe-forum-pet.state.'.$day;
    }

    /** @return array<string, mixed> */
    private function build(string $day): array
    {
        $pet = Pet::current();
        $now = Carbon::now();

        $recent = Post::query()->where('type', 'comment')->where('created_at', '>=', $now->copy()->subHours(self::RECENT_HOURS))->count();

        // How busy a usual three hours is, and how much care a usual day brings: hourly is plenty.
        $usual = $this->cache->remember('ernestdefoe-forum-pet.usual.'.$day, 3600, function () use ($now, $day) {
            $posts = Post::query()->where('type', 'comment')->where('created_at', '>=', $now->copy()->subDays(14))->count();
            $care = Care::query()->where('day', '>=', Carbon::parse($day)->subDays(7)->toDateString())->where('day', '<', $day)
                ->selectRaw('kind, count(*) as n')->groupBy('kind')->pluck('n', 'kind');

            return [
                'posts' => round($posts / (14 * 24 / self::RECENT_HOURS), 2),
                'feed' => round((int) ($care['feed'] ?? 0) / 7, 2),
                'play' => round((int) ($care['play'] ?? 0) / 7, 2),
            ];
        });

        $today = Care::query()->where('day', $day)->where('created_at', '>=', $pet->born_at)
            ->selectRaw('kind, count(*) as n')->groupBy('kind')->pluck('n', 'kind');
        $caretakers = (int) Care::query()->where('day', $day)->where('created_at', '>=', $pet->born_at)
            ->selectRaw('count(distinct user_id) as n')->value('n');

        return [
            'name' => $this->config->name(),
            'species' => $this->config->species(),
            'skin' => $this->config->skin(),
            'art' => $this->config->art(),
            'stage' => $pet->stage,
            'careTotal' => $pet->care_total,
            'growth' => $this->config->growth(),
            'bornAt' => $pet->born_at->toIso8601String(),
            'stageDates' => array_map(fn ($column) => $pet->{$column}?->toIso8601String(), Pet::STAGE_DATES),
            'milestone' => $pet->milestone,
            'milestoneAt' => $pet->milestone_at?->toIso8601String(),
            'recent' => $recent,
            'usual' => $usual,
            'feeds' => (int) ($today['feed'] ?? 0),
            'plays' => (int) ($today['play'] ?? 0),
            'caretakers' => $caretakers,
            'list' => $this->caretakers($day, $pet->born_at),
            'hat' => $this->holiday->hat(),
            'day' => $day,
        ];
    }

    /**
     * Today's caretakers, latest first, with what each did.
     *
     * @return list<array<string, mixed>>
     */
    private function caretakers(string $day, Carbon $since): array
    {
        $latest = Care::query()->where('day', $day)->where('created_at', '>=', $since)
            ->selectRaw('user_id, max(created_at) as last')->groupBy('user_id')
            ->orderByDesc('last')->limit(self::LIST)->pluck('user_id')->all();

        if (! $latest) {
            return [];
        }

        $kinds = [];
        foreach (Care::query()->where('day', $day)->whereIn('user_id', $latest)->get(['user_id', 'kind']) as $row) {
            $kinds[$row->user_id][] = $row->kind;
        }

        $users = User::query()->whereIn('id', $latest)->get()->keyBy('id');

        $list = [];
        foreach ($latest as $id) {
            if ($user = $users->get($id)) {
                $list[] = $this->person($user) + ['kinds' => array_values(array_intersect(Settings::KINDS, $kinds[$id] ?? []))];
            }
        }

        return $list;
    }

    /** @return array<string, mixed> */
    public function person(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->display_name,
            'slug' => $this->slugs->forResource(User::class)->toSlug($user),
            'avatar' => $user->avatar_url,
        ];
    }

    /**
     * The pet as one viewer sees it: the shared state, its mood worked out
     * for this moment, and whether they have fed and played with it today.
     *
     * @return array<string, mixed>
     */
    public function present(User $actor, bool $page = false): array
    {
        $s = $this->shared();
        $now = time();

        $celebrate = null;
        $evolvedAt = $s['stage'] > Pet::EGG ? $s['stageDates'][$s['stage']] : null;
        if ($evolvedAt && $now - strtotime($evolvedAt) < 86400) {
            $celebrate = ['kind' => 'evolved', 'stage' => $s['stage'], 'at' => $evolvedAt];
        } elseif ($s['milestoneAt'] && $now - strtotime($s['milestoneAt']) < 86400) {
            $celebrate = ['kind' => 'milestone', 'count' => $s['milestone'], 'at' => $s['milestoneAt']];
        }

        // Activity against a usual three hours: 1 is a normal day, 2 is twice as busy.
        $ratio = $s['recent'] / max($s['usual']['posts'], 1);

        $mood = match (true) {
            $celebrate !== null => 'celebrating',
            $ratio >= 1.6 && $s['recent'] >= 3 => 'excited',
            $s['recent'] === 0 || $ratio < 0.35 => 'sleepy',
            $s['feeds'] > 0 && $s['plays'] > 0 => 'happy',
            default => 'idle',
        };

        $mine = null;
        $canCare = ! $actor->isGuest() && $actor->can(Settings::CARE);
        if ($canCare) {
            $done = Care::query()->where('user_id', $actor->id)->where('day', $s['day'])->pluck('kind')->all();
            $mine = ['feed' => in_array('feed', $done, true), 'play' => in_array('play', $done, true)];
        }

        $hat = $s['hat'];
        if ($hat && ! $actor->isGuest() && $actor->getPreference('festoonDecorations') === false) {
            $hat = null;
        }

        $state = $s;
        unset($state['usual'], $state['day']);
        if (! $page) {
            $state['list'] = array_slice($s['list'], 0, self::SIDEBAR);
        }

        return $state + [
            'mood' => $mood,
            'energy' => self::percent($ratio / 2),
            'fullness' => self::percent($s['feeds'] / max($s['usual']['feed'], 3)),
            'fun' => self::percent($s['plays'] / max($s['usual']['play'], 3)),
            'celebrate' => $celebrate,
            'canCare' => $canCare,
            'mine' => $mine,
            'hat' => $hat,
        ];
    }

    private static function percent(float $share): int
    {
        return (int) max(0, min(100, round($share * 100)));
    }

    /**
     * Everything the pet's own page shows: today's caretakers in full, the
     * most devoted caretakers since it was born, and the viewer's streak.
     *
     * @return array<string, mixed>
     */
    public function page(User $actor): array
    {
        $state = $this->present($actor, true);
        $born = Carbon::parse($state['bornAt']);

        $board = $this->cache->remember('ernestdefoe-forum-pet.board.'.$born->getTimestamp(), 600, function () use ($born) {
            $top = Care::query()->where('created_at', '>=', $born)
                ->selectRaw('user_id, count(*) as n')->groupBy('user_id')
                ->orderByDesc('n')->orderBy('user_id')->limit(10)->pluck('n', 'user_id')->all();
            $users = $top ? User::query()->whereIn('id', array_keys($top))->get()->keyBy('id') : collect();

            $list = [];
            foreach ($top as $id => $count) {
                if ($user = $users->get($id)) {
                    $list[] = $this->person($user) + ['count' => (int) $count];
                }
            }

            return [
                'top' => $list,
                'everyone' => (int) Care::query()->where('created_at', '>=', $born)->selectRaw('count(distinct user_id) as n')->value('n'),
            ];
        });

        return $state + $board + ['streak' => $state['mine'] !== null ? $this->streak($actor) : 0];
    }

    /** Days in a row the viewer has cared for the pet, up to today (or yesterday, if not yet today). */
    private function streak(User $actor): int
    {
        $today = Carbon::parse($this->clock->today());
        $days = Care::query()->where('user_id', $actor->id)->where('day', '>=', $today->copy()->subDays(366)->toDateString())
            ->distinct()->pluck('day')->map(fn ($day) => substr((string) $day, 0, 10))->flip();

        $day = isset($days[$today->toDateString()]) ? $today : $today->copy()->subDay();
        $streak = 0;
        while (isset($days[$day->toDateString()])) {
            $streak++;
            $day = $day->copy()->subDay();
        }

        return $streak;
    }
}
