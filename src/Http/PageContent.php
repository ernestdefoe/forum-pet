<?php

namespace ErnestDefoe\ForumPet\Http;

use ErnestDefoe\ForumPet\Config;
use Flarum\Frontend\Document;
use Flarum\Http\UrlGenerator;
use Flarum\Locale\TranslatorInterface;
use Psr\Http\Message\ServerRequestInterface;

/** /pet as the server sends it: a title and a canonical URL. The pet itself needs JavaScript. */
class PageContent
{
    public function __construct(
        private readonly UrlGenerator $url,
        private readonly TranslatorInterface $translator,
        private readonly Config $config,
    ) {
    }

    public function __invoke(Document $document, ServerRequestInterface $request): Document
    {
        $document->title = (string) $this->translator->trans('ernestdefoe-forum-pet.forum.page.title', ['pet' => $this->config->name()]);
        $document->canonicalUrl = $this->url->to('forum')->route('forumPet');
        $document->meta['description'] = (string) $this->translator->trans('ernestdefoe-forum-pet.forum.page.description', ['pet' => $this->config->name()]);

        return $document;
    }
}
