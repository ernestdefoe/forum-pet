<?php

namespace ErnestDefoe\ForumPet\Tests\integration\api;

use Carbon\Carbon;
use ErnestDefoe\ForumPet\Care;
use ErnestDefoe\ForumPet\Caretaking;
use ErnestDefoe\ForumPet\Config;
use ErnestDefoe\ForumPet\Milestones;
use ErnestDefoe\ForumPet\Pet;
use Flarum\Group\Permission;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use Laminas\Diactoros\UploadedFile;
use PHPUnit\Framework\Attributes\Test;

class PetTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-forum-pet');

        $this->prepareDatabase([
            User::class => [
                $this->normalUser(),
                ['id' => 3, 'username' => 'dana', 'email' => 'dana@machine.local', 'is_email_confirmed' => 1],
                ['id' => 4, 'username' => 'sam', 'email' => 'sam@machine.local', 'is_email_confirmed' => 1],
            ],
        ]);
    }

    /** @return array{int, array<string, mixed>|null} */
    private function api(string $method, string $path, ?int $as, array $body = []): array
    {
        $options = $as ? ['authenticatedAs' => $as] : [];
        if ($method !== 'GET') {
            $options['json'] = $body;
        }
        $response = $this->send($this->request($method, '/api/forum-pet'.$path, $options));

        return [$response->getStatusCode(), json_decode((string) $response->getBody(), true)];
    }

    private function care(int $as, string $kind): array
    {
        [$status, $body] = $this->api('POST', '/care', $as, ['kind' => $kind]);
        $this->assertSame(200, $status, json_encode($body));

        return $body;
    }

    #[Test]
    public function guests_see_the_pet_but_cannot_care_for_it(): void
    {
        [$status, $body] = $this->api('GET', '', null);
        $this->assertSame(200, $status);
        $this->assertSame('Pip', $body['name']);
        $this->assertSame(0, $body['stage']);
        $this->assertNull($body['mine']);
        $this->assertFalse($body['canCare']);

        // Refused before it reaches the pet (no session, so no CSRF token either).
        $this->assertContains($this->api('POST', '/care', null, ['kind' => 'feed'])[0], [400, 401]);
        $this->assertSame(0, Care::query()->count());
    }

    #[Test]
    public function feeding_counts_once_a_day(): void
    {
        $first = $this->care(2, 'feed');
        $this->assertTrue($first['done']);
        $this->assertSame(['feed' => true, 'play' => false], $first['state']['mine']);
        $this->assertSame(1, $first['state']['feeds']);
        $this->assertSame('normal', $first['state']['list'][0]['slug']);

        $again = $this->care(2, 'feed');
        $this->assertFalse($again['done']);
        $this->assertSame(1, Pet::query()->value('care_total'));

        $this->assertTrue($this->care(2, 'play')['done']);
        $this->assertSame(2, Pet::query()->value('care_total'));
        $this->assertSame(2, Care::query()->where('user_id', 2)->count());
    }

    #[Test]
    public function a_race_of_taps_adds_one_row(): void
    {
        $caretaking = $this->app()->getContainer()->make(Caretaking::class);
        $user = User::query()->findOrFail(2);

        $results = [$caretaking->care($user, 'feed'), $caretaking->care($user, 'feed'), $caretaking->care($user, 'feed')];

        $this->assertSame([true, false, false], array_column($results, 'done'));
        $this->assertSame(1, Pet::query()->value('care_total'));
    }

    #[Test]
    public function only_feed_and_play_are_kinds_of_care(): void
    {
        $this->assertSame(422, $this->api('POST', '/care', 2, ['kind' => 'pet'])[0]);
        $this->assertSame(422, $this->api('POST', '/care', 2, ['kind' => ['feed']])[0]);
        $this->assertSame(0, Care::query()->count());
    }

    #[Test]
    public function members_without_the_permission_cannot_care(): void
    {
        $this->app();
        Permission::query()->where('permission', 'forumPet.care')->delete();

        $this->assertSame(403, $this->api('POST', '/care', 2, ['kind' => 'feed'])[0]);
        $this->assertFalse($this->api('GET', '', 2)[1]['canCare']);
    }

    #[Test]
    public function the_pet_evolves_once_when_care_crosses_a_stage(): void
    {
        $this->setting('ernestdefoe-forum-pet.growth', '2,4,6');

        $this->assertNull($this->care(2, 'feed')['evolved']);
        $hatch = $this->care(3, 'feed');
        $this->assertSame(1, $hatch['evolved']);
        $this->assertSame(1, $hatch['state']['stage']);
        $this->assertSame('celebrating', $hatch['state']['mood']);
        $this->assertSame(['kind' => 'evolved', 'stage' => 1], array_intersect_key($hatch['state']['celebrate'], ['kind' => 1, 'stage' => 1]));

        // Already at the stage its care earned: nobody else is told it evolved.
        $this->assertNull($this->app()->getContainer()->make(Caretaking::class)->grow());

        $pet = Pet::query()->findOrFail(1);
        $this->assertNotNull($pet->hatched_at);
        $this->assertNull($pet->grown_at);
    }

    #[Test]
    public function a_lowered_threshold_can_jump_stages_and_dates_every_one(): void
    {
        $this->setting('ernestdefoe-forum-pet.growth', '2,4,6');
        $this->app();
        Pet::query()->whereKey(1)->update(['care_total' => 10]);

        $this->assertSame(3, $this->care(2, 'feed')['evolved']);
        $pet = Pet::query()->findOrFail(1);
        $this->assertSame(3, $pet->stage);
        $this->assertNotNull($pet->hatched_at);
        $this->assertNotNull($pet->grown_at);
        $this->assertNotNull($pet->ascended_at);
    }

    #[Test]
    public function bad_growth_settings_fall_back_to_the_defaults(): void
    {
        $this->assertSame([15, 75, 300], Config::parseGrowth('10,5,20'));
        $this->assertSame([15, 75, 300], Config::parseGrowth('0,5,20'));
        $this->assertSame([15, 75, 300], Config::parseGrowth('a,b,c'));
        $this->assertSame([15, 75, 300], Config::parseGrowth('1,2'));
        $this->assertSame([3, 9, 27], Config::parseGrowth(' 3, 9 ,27 '));
    }

    #[Test]
    public function only_admins_start_over(): void
    {
        $this->care(2, 'feed');
        $this->assertSame(403, $this->api('POST', '/reset', 2)[0]);

        $this->assertSame(204, $this->api('POST', '/reset', 1)[0]);
        $this->assertSame(0, Pet::query()->value('care_total'));
        $this->assertSame(0, Care::query()->count());

        // Today's care was cleared, so everyone can welcome the new egg.
        $this->assertTrue($this->care(2, 'feed')['done']);
    }

    #[Test]
    public function the_page_has_the_board_and_the_streak(): void
    {
        $this->app();
        $day = fn (int $ago) => Carbon::today()->subDays($ago)->toDateString();
        Pet::query()->whereKey(1)->update(['born_at' => Carbon::now()->subDays(10)]);
        foreach ([1, 2, 3] as $ago) {
            Care::query()->insert(['user_id' => 2, 'day' => $day($ago), 'kind' => 'feed', 'created_at' => Carbon::now()->subDays($ago)]);
        }
        Care::query()->insert(['user_id' => 3, 'day' => $day(2), 'kind' => 'play', 'created_at' => Carbon::now()->subDays(2)]);

        [, $page] = $this->api('GET', '', 2);
        $this->assertSame(3, $page['streak']); // yesterday back: today not yet
        $this->assertSame([2, 3], array_column($page['top'], 'id'));
        $this->assertSame(2, $page['everyone']);

        $this->care(2, 'play');
        $this->assertSame(4, $this->api('GET', '', 2)[1]['streak']);
    }

    #[Test]
    public function the_forum_payload_carries_the_pet_for_this_viewer(): void
    {
        $this->care(2, 'feed');

        $response = $this->send($this->request('GET', '/api', ['authenticatedAs' => 2]));
        $pet = json_decode((string) $response->getBody(), true)['data']['attributes']['forumPet'];

        $this->assertSame(['feed' => true, 'play' => false], $pet['mine']);
        $this->assertCount(1, $pet['list']);

        Permission::query()->where('permission', 'forumPet.view')->delete();
        $guest = json_decode((string) $this->send($this->request('GET', '/api'))->getBody(), true);
        $this->assertArrayNotHasKey('forumPet', $guest['data']['attributes']);
        $this->assertSame(403, $this->api('GET', '', null)[0]);
    }

    #[Test]
    public function art_uploads_are_admin_only_and_raster_only(): void
    {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
        $upload = function (int $as, string $bytes, string $name) {
            $path = tempnam(sys_get_temp_dir(), 'fpet');
            file_put_contents($path, $bytes);
            $request = $this->request('POST', '/api/forum-pet/art/happy', ['authenticatedAs' => $as])
                ->withUploadedFiles(['art' => new UploadedFile($path, strlen($bytes), UPLOAD_ERR_OK, $name, 'image/png')]);

            return $this->send($request)->getStatusCode();
        };

        $this->assertSame(403, $upload(2, $svg, 'x.png'));
        $this->assertSame(422, $upload(1, $svg, 'x.png'));

        $im = imagecreatetruecolor(64, 64);
        ob_start();
        imagepng($im);
        $png = (string) ob_get_clean();
        $this->assertSame(200, $upload(1, $png, 'happy.png'));

        $art = $this->api('GET', '', null)[1]['art'];
        $this->assertMatchesRegularExpression('#/assets/forum-pet/happy-[0-9a-f]{10}\.png$#', $art['happy']);

        $this->assertSame(404, $this->send($this->request('POST', '/api/forum-pet/art/nope', ['authenticatedAs' => 1]))->getStatusCode());
        $this->assertSame(204, $this->send($this->request('DELETE', '/api/forum-pet/art/happy', ['authenticatedAs' => 1]))->getStatusCode());
        $this->assertSame([], $this->api('GET', '', null)[1]['art']);
    }

    #[Test]
    public function milestones_are_round_numbers(): void
    {
        $this->assertSame(0, Milestones::reached(99));
        $this->assertSame(100, Milestones::reached(100));
        $this->assertSame(10000, Milestones::reached(24999));
        $this->assertSame(3000000, Milestones::reached(3456789));
        $this->assertSame(100, Milestones::next(0));
        $this->assertSame(250, Milestones::next(100));
        $this->assertSame(2000000, Milestones::next(1000000));
    }

    #[Test]
    public function the_pet_cheers_when_the_post_count_passes_a_milestone(): void
    {
        $this->prepareDatabase([
            \Flarum\Discussion\Discussion::class => [
                ['id' => 1, 'title' => 'Chat', 'created_at' => Carbon::now(), 'user_id' => 2, 'first_post_id' => 1, 'comment_count' => 99, 'last_post_number' => 99],
            ],
            \Flarum\Post\Post::class => array_map(fn ($i) => ['id' => $i, 'discussion_id' => 1, 'user_id' => 2, 'type' => 'comment', 'content' => '<t><p>Hi</p></t>', 'created_at' => Carbon::now()->subHour(), 'number' => $i], range(1, 99)),
        ]);
        // The 100th post, through the API like any reply.
        $response = $this->send($this->request('POST', '/api/posts', [
            'authenticatedAs' => 2,
            'json' => ['data' => ['type' => 'posts', 'attributes' => ['content' => 'One hundred!'], 'relationships' => ['discussion' => ['data' => ['type' => 'discussions', 'id' => '1']]]]],
        ]));
        $this->assertSame(201, $response->getStatusCode(), (string) $response->getBody());

        $pet = Pet::query()->findOrFail(1);
        $this->assertSame(100, $pet->milestone);
        $this->assertNotNull($pet->milestone_at);

        [, $state] = $this->api('GET', '', null);
        $this->assertSame('celebrating', $state['mood']);
        $this->assertSame(['kind' => 'milestone', 'count' => 100], array_intersect_key($state['celebrate'], ['kind' => 1, 'count' => 1]));
    }

    #[Test]
    public function a_forum_closed_to_guests_shows_them_no_pet(): void
    {
        $this->app();
        // Installed on a forum open to guests, so guests were given the pet too.
        $this->assertTrue(Permission::query()->where('group_id', 2)->where('permission', 'forumPet.view')->exists());

        // Closed to guests the usual way: members get viewForum themselves.
        Permission::query()->where('group_id', 2)->where('permission', 'viewForum')->delete();
        Permission::query()->insert(['group_id' => 3, 'permission' => 'viewForum']);

        $this->assertSame(403, $this->api('GET', '', null)[0]);
        $this->assertSame(200, $this->api('GET', '', 2)[0]);
    }

    #[Test]
    public function a_milestone_crossed_by_quick_posts_is_cheered_at_once(): void
    {
        $this->prepareDatabase([
            \Flarum\Discussion\Discussion::class => [
                ['id' => 1, 'title' => 'Chat', 'created_at' => Carbon::now(), 'user_id' => 2, 'first_post_id' => 1, 'comment_count' => 97, 'last_post_number' => 97],
            ],
            \Flarum\Post\Post::class => array_map(fn ($i) => ['id' => $i, 'discussion_id' => 1, 'user_id' => 2, 'type' => 'comment', 'content' => '<t><p>Hi</p></t>', 'created_at' => Carbon::now()->subHour(), 'number' => $i], range(1, 97)),
        ]);

        // Posts 98, 99 and 100 within a second of each other, by three members (flood control is per member).
        foreach ([2, 3, 4] as $as) {
            $response = $this->send($this->request('POST', '/api/posts', [
                'authenticatedAs' => $as,
                'json' => ['data' => ['type' => 'posts', 'attributes' => ['content' => 'Nearly there'], 'relationships' => ['discussion' => ['data' => ['type' => 'discussions', 'id' => '1']]]]],
            ]));
            $this->assertSame(201, $response->getStatusCode(), (string) $response->getBody());
        }

        $this->assertSame(100, Pet::query()->value('milestone'));
    }
}
