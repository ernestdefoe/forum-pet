<?php

namespace ErnestDefoe\ForumPet\Api;

use ErnestDefoe\ForumPet\Art;
use ErnestDefoe\ForumPet\Settings;
use Flarum\Http\RequestUtil;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\EmptyResponse;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/** POST (upload) and DELETE /api/forum-pet/art/{state}: an admin's own picture for a mood. */
class ArtController implements RequestHandlerInterface
{
    public function __construct(private readonly Art $art)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $state = Arr::get($request->getQueryParams(), 'state');
        if (! in_array($state, Settings::STATES, true)) {
            return Errors::make(404, 'forum_pet_bad_state');
        }

        if ($request->getMethod() === 'DELETE') {
            $this->art->remove($state);

            return new EmptyResponse(204);
        }

        $file = Arr::get($request->getUploadedFiles(), 'art');
        if (! $file) {
            return Errors::make(422, 'forum_pet_upload_failed');
        }

        $error = $this->art->store($state, $file);

        return $error ? Errors::make(422, $error) : new JsonResponse(['ok' => true]);
    }
}
