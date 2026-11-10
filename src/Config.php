<?php

namespace ErnestDefoe\ForumPet;

use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Contracts\Filesystem\Cloud;
use Illuminate\Contracts\Filesystem\Factory;

/** What the admin chose: the pet's name and look, how fast it grows, and any uploaded art. */
class Config
{
    public function __construct(
        private readonly SettingsRepositoryInterface $settings,
        private readonly Factory $filesystems,
    ) {
    }

    public function name(): string
    {
        $name = trim((string) $this->settings->get(Settings::NAME));

        return $name === '' ? 'Pip' : mb_substr($name, 0, 40);
    }

    public function species(): string
    {
        $species = (string) $this->settings->get(Settings::SPECIES);

        return isset(Settings::SPECIES_SKINS[$species]) ? $species : 'dumpling';
    }

    public function skin(): string
    {
        $skin = (string) $this->settings->get(Settings::SKIN);
        $skins = Settings::SPECIES_SKINS[$this->species()];

        return in_array($skin, $skins, true) ? $skin : $skins[0];
    }

    /**
     * Care needed to hatch, to grow up and to reach the special form. A
     * setting that is not three rising numbers falls back to the defaults.
     *
     * @return array{int, int, int}
     */
    public function growth(): array
    {
        return self::parseGrowth((string) $this->settings->get(Settings::GROWTH));
    }

    /** @return array{int, int, int} */
    public static function parseGrowth(string $raw): array
    {
        $parts = array_map('trim', explode(',', $raw));
        if (count($parts) !== 3) {
            return Settings::DEFAULT_GROWTH;
        }
        foreach ($parts as $part) {
            if (! ctype_digit($part)) {
                return Settings::DEFAULT_GROWTH;
            }
        }
        [$a, $b, $c] = array_map('intval', $parts);

        return $a >= 1 && $b > $a && $c > $b && $c <= 10_000_000 ? [$a, $b, $c] : Settings::DEFAULT_GROWTH;
    }

    public function stageFor(int $careTotal): int
    {
        $stage = Pet::EGG;
        foreach ($this->growth() as $i => $needed) {
            if ($careTotal >= $needed) {
                $stage = $i + 1;
            }
        }

        return $stage;
    }

    /** @return array<string, string> uploaded art by state, as public URLs */
    public function art(): array
    {
        $disk = $this->filesystems->disk('flarum-assets');
        $urls = [];

        foreach ($this->artPaths() as $state => $path) {
            $urls[$state] = $disk instanceof Cloud ? $disk->url($path) : '/assets/'.$path;
        }

        return $urls;
    }

    /** @return array<string, string> */
    public function artPaths(): array
    {
        $paths = json_decode((string) $this->settings->get(Settings::ART), true);

        return is_array($paths) ? array_filter(
            array_intersect_key($paths, array_flip(Settings::STATES)),
            fn ($path) => is_string($path) && str_starts_with($path, Art::DIR.'/')
        ) : [];
    }
}
