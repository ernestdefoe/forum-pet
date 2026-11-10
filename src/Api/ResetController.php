<?php

namespace ErnestDefoe\ForumPet\Api;

use ErnestDefoe\ForumPet\Caretaking;
use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\EmptyResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/** POST /api/forum-pet/reset: admins start over with a new egg. */
class ResetController implements RequestHandlerInterface
{
    public function __construct(private readonly Caretaking $caretaking)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();
        $this->caretaking->reset();

        return new EmptyResponse(204);
    }
}
