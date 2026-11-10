<?php

namespace ErnestDefoe\ForumPet;

use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Contracts\Filesystem\Factory;
use Illuminate\Contracts\Filesystem\Filesystem;
use Psr\Http\Message\UploadedFileInterface;

/**
 * An admin's own picture for one of the pet's moods. Only raster images
 * (PNG, GIF, WebP, JPEG) are accepted, sniffed from the bytes and not from
 * the name: an SVG served from the forum's own domain can run script.
 */
class Art
{
    public const DIR = 'forum-pet';
    public const MAX_BYTES = 2 * 1024 * 1024;

    private const TYPES = [IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif', IMAGETYPE_WEBP => 'webp', IMAGETYPE_JPEG => 'jpg'];

    private Filesystem $disk;

    public function __construct(
        Factory $filesystems,
        private readonly SettingsRepositoryInterface $settings,
        private readonly Config $config,
        private readonly State $state,
    ) {
        $this->disk = $filesystems->disk('flarum-assets');
    }

    /** @return string|null an error code, or null when stored */
    public function store(string $state, UploadedFileInterface $file): ?string
    {
        if ($file->getError() !== UPLOAD_ERR_OK) {
            return 'forum_pet_upload_failed';
        }
        if ((int) $file->getSize() > self::MAX_BYTES) {
            return 'forum_pet_upload_too_big';
        }

        $bytes = (string) $file->getStream();
        $info = @getimagesizefromstring($bytes);
        $ext = $info ? (self::TYPES[$info[2]] ?? null) : null;
        if (! $ext || $info[0] < 16 || $info[1] < 16 || $info[0] > 4096 || $info[1] > 4096) {
            return 'forum_pet_upload_not_image';
        }

        $path = self::DIR.'/'.$state.'-'.bin2hex(random_bytes(5)).'.'.$ext;
        $this->disk->put($path, $bytes);
        $this->save($state, $path);

        return null;
    }

    public function remove(string $state): void
    {
        $this->save($state, null);
    }

    private function save(string $state, ?string $path): void
    {
        $paths = $this->config->artPaths();
        if (isset($paths[$state])) {
            $this->disk->delete($paths[$state]);
        }

        if ($path === null) {
            unset($paths[$state]);
        } else {
            $paths[$state] = $path;
        }

        $this->settings->set(Settings::ART, json_encode($paths));
        $this->state->forget();
    }
}
