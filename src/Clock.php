<?php

namespace ErnestDefoe\ForumPet;

use Carbon\Carbon;
use Flarum\Settings\SettingsRepositoryInterface;

/** "Today" for the pet: the date in the timezone the admin chose (UTC if none or an unknown one). */
class Clock
{
    private ?string $zone = null;

    public function __construct(private readonly SettingsRepositoryInterface $settings)
    {
    }

    public function timezone(): string
    {
        if ($this->zone === null) {
            $zone = trim((string) $this->settings->get(Settings::TIMEZONE));
            $this->zone = $zone !== '' && in_array($zone, \DateTimeZone::listIdentifiers(), true) ? $zone : 'UTC';
        }

        return $this->zone;
    }

    public function today(): string
    {
        return Carbon::now($this->timezone())->toDateString();
    }
}
