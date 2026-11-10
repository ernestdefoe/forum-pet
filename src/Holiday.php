<?php

namespace ErnestDefoe\ForumPet;

use Flarum\Extension\ExtensionManager;
use Illuminate\Contracts\Container\Container;

/**
 * The hat for today, from Festoon (ernestdefoe/festoon) when it is
 * installed and enabled: whatever hat today's holiday look wears, if it is
 * one the pet has. Without Festoon, no hat.
 */
class Holiday
{
    public const HATS = ['santa', 'witch', 'tophat', 'party', 'beanie', 'leprechaun', 'bunny'];

    private const SCHEDULE = 'Ernestdefoe\\Festoon\\Look\\Schedule';
    private const CONFIG = 'Ernestdefoe\\Festoon\\Config';

    public function __construct(private readonly Container $container, private readonly ExtensionManager $extensions)
    {
    }

    public function hat(): ?string
    {
        if (! class_exists(self::SCHEDULE) || ! $this->extensions->isEnabled('ernestdefoe-festoon')) {
            return null;
        }

        try {
            $config = $this->container->make(self::CONFIG);
            // Festoon off, or its hats switched off: no hat for the pet either.
            if (! $config->enabled() || ! (($config->parts()['hats'] ?? true))) {
                return null;
            }
            $hat = $this->container->make(self::SCHEDULE)->active()?->get('hat');
        } catch (\Throwable) {
            // A Festoon that changed its insides must never take the pet down with it.
            return null;
        }

        return in_array($hat, self::HATS, true) ? $hat : null;
    }
}
