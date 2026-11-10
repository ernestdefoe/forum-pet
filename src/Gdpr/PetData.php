<?php

namespace ErnestDefoe\ForumPet\Gdpr;

use ErnestDefoe\ForumPet\Care;
use Flarum\Gdpr\Data\Type;

/** A member's export: the days they fed or played with the pet. Erasing removes them. */
class PetData extends Type
{
    public static function exportDescription(): string
    {
        return self::staticTranslator()->trans('ernestdefoe-forum-pet.lib.gdpr.export');
    }

    public static function anonymizeDescription(): string
    {
        return self::deleteDescription();
    }

    public static function deleteDescription(): string
    {
        return self::staticTranslator()->trans('ernestdefoe-forum-pet.lib.gdpr.delete');
    }

    public function export(): ?array
    {
        $rows = Care::query()->where('user_id', $this->user->id)->orderBy('created_at')->get(['day', 'kind', 'created_at'])->toArray();

        return [['forum-pet/care.json' => $this->encodeForExport($rows)]];
    }

    public function anonymize(): void
    {
        $this->delete();
    }

    public function delete(): void
    {
        Care::query()->where('user_id', $this->user->id)->delete();
    }
}
