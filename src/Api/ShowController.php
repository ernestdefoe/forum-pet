<?php

namespace ErnestDefoe\ForumPet\Api;

use ErnestDefoe\ForumPet\Settings;
use ErnestDefoe\ForumPet\State;
use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/** GET /api/forum-pet: everything the pet's page shows. */
class ShowController implements RequestHandlerInterface
{
    public function __construct(private readonly State $state)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        if (! Settings::canView($actor)) {
            throw new \Flarum\User\Exception\PermissionDeniedException();
        }

        return new JsonResponse($this->state->page($actor));
    }
}
