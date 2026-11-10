<?php

/*
 * Forum Pet: a shared mascot the whole community takes care of.
 *
 * The pet is one row (Pet) that grows with every feed and play (Care, once
 * per member per day, enforced by a unique key). Its mood follows the
 * forum's activity; all of that is one cached array (State) rebuilt at most
 * once a minute, so a page view costs a cache read plus, for members, one
 * indexed lookup of their own care today. It cheers when the post count
 * passes a round number (Milestones) and wears today's hat from Festoon.
 *
 * forum.js only wires up the routes, the sidebar card, the corner widget and
 * the celebration banner; the art and the page are a lazy chunk.
 */

use ErnestDefoe\ForumPet\Api;
use ErnestDefoe\ForumPet\Gdpr\PetData;
use ErnestDefoe\ForumPet\Http\PageContent;
use ErnestDefoe\ForumPet\Milestones;
use ErnestDefoe\ForumPet\Settings;
use ErnestDefoe\ForumPet\State;
use Flarum\Api\Context;
use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Schema;
use Flarum\Extend;
use Flarum\Gdpr\Extend\UserData;
use Flarum\Post\Event\Posted;
use Flarum\Settings\Event\Saved;
use Flarum\User\Event\Deleted;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        // 🚨 Not optional: the art and the page are chunks in here, and undeclared chunks 404.
        ->jsDirectory(__DIR__.'/js/dist/forum')
        ->css(__DIR__.'/less/forum.less')
        ->route('/pet', 'forumPet', PageContent::class),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/less/admin.less'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Routes('api'))
        ->get('/forum-pet', 'forumPet.show', Api\ShowController::class)
        ->post('/forum-pet/care', 'forumPet.care', Api\CareController::class)
        ->post('/forum-pet/art/{state}', 'forumPet.art.upload', Api\ArtController::class)
        ->delete('/forum-pet/art/{state}', 'forumPet.art.delete', Api\ArtController::class)
        ->post('/forum-pet/reset', 'forumPet.reset', Api\ResetController::class),

    // The pet as this viewer sees it, from the cached state.
    (new Extend\ApiResource(ForumResource::class))
        ->fields(fn () => [
            Schema\Arr::make('forumPet')
                ->visible(fn ($forum, Context $context) => $context->getActor()->can(Settings::VIEW))
                ->get(fn ($forum, Context $context) => resolve(State::class)->present($context->getActor())),
        ]),

    (new Extend\Settings())
        ->default(Settings::NAME, 'Pip')
        ->default(Settings::SPECIES, 'dumpling')
        ->default(Settings::SKIN, 'peach')
        ->default(Settings::GROWTH, implode(',', Settings::DEFAULT_GROWTH))
        ->default(Settings::TIMEZONE, 'UTC')
        ->default(Settings::SIDEBAR, true)
        ->default(Settings::CORNER, true)
        ->default(Settings::NAV, true)
        ->serializeToForum('forumPetSidebar', Settings::SIDEBAR, 'boolval')
        ->serializeToForum('forumPetCorner', Settings::CORNER, 'boolval')
        ->serializeToForum('forumPetNav', Settings::NAV, 'boolval'),

    (new Extend\Event())
        ->listen(Posted::class, Milestones::class)
        // The name, look and growth are in the cached state: show a change at once.
        ->listen(Saved::class, function (Saved $event) {
            foreach (array_keys($event->settings) as $key) {
                if (str_starts_with($key, Settings::PREFIX)) {
                    resolve(State::class)->forget();

                    return;
                }
            }
        })
        // The foreign key does this too, where the database enforces it (SQLite may not).
        ->listen(Deleted::class, function (Deleted $event) {
            \ErnestDefoe\ForumPet\Care::query()->where('user_id', $event->user->id)->delete();
        }),

    (new Extend\Conditional())
        ->whenExtensionEnabled('flarum-gdpr', fn () => [
            (new UserData())->addType(PetData::class),
        ]),
];
