<?php

namespace ErnestDefoe\ForumPet\Api;

use ErnestDefoe\ForumPet\Caretaking;
use ErnestDefoe\ForumPet\Settings;
use ErnestDefoe\ForumPet\State;
use Flarum\Http\RequestUtil;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * POST /api/forum-pet/care {kind: feed|play}. Once per member per day for
 * each; a repeat answers done: false with the current state, so a second
 * tab or a double tap simply shows "already done today".
 */
class CareController implements RequestHandlerInterface
{
    public function __construct(private readonly Caretaking $caretaking, private readonly State $state)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertRegistered();
        if (! Settings::canView($actor)) {
            throw new \Flarum\User\Exception\PermissionDeniedException();
        }
        $actor->assertCan(Settings::CARE);

        $kind = Arr::get((array) $request->getParsedBody(), 'kind');
        if (! is_string($kind) || ! in_array($kind, Settings::KINDS, true)) {
            return Errors::make(422, 'forum_pet_bad_kind');
        }

        $result = $this->caretaking->care($actor, $kind);

        return new JsonResponse($result + ['state' => $this->state->present($actor)]);
    }
}
