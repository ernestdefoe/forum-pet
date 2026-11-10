<?php

namespace ErnestDefoe\ForumPet;

final class Settings
{
    public const PREFIX = 'ernestdefoe-forum-pet.';

    public const NAME = self::PREFIX.'name';
    public const SPECIES = self::PREFIX.'species';
    public const SKIN = self::PREFIX.'skin';
    public const GROWTH = self::PREFIX.'growth';     // "15,75,300": care needed to hatch, grow up and reach the special form
    public const TIMEZONE = self::PREFIX.'timezone'; // when "today" starts and ends
    public const SIDEBAR = self::PREFIX.'sidebar';
    public const CORNER = self::PREFIX.'corner';     // a corner widget wherever the sidebar card isn't showing
    public const NAV = self::PREFIX.'nav';
    public const ART = self::PREFIX.'art';           // JSON {state: path on the assets disk}

    public const VIEW = 'forumPet.view';
    public const CARE = 'forumPet.care';

    public const DEFAULT_GROWTH = [15, 75, 300];

    /** Built-in looks: each species comes in three skins. */
    public const SPECIES_SKINS = [
        'dumpling' => ['peach', 'snow', 'cocoa'],
        'sprout' => ['meadow', 'mint', 'autumn'],
        'comet' => ['sky', 'ember', 'violet'],
    ];

    /** The moods the pet shows, which are also the states an admin can upload art for. */
    public const STATES = ['idle', 'happy', 'eating', 'sleepy', 'excited', 'celebrating'];

    public const KINDS = ['feed', 'play'];

    /** Seeing the pet means seeing the forum too: a forum closed to guests shows them no caretakers. */
    public static function canView(\Flarum\User\User $actor): bool
    {
        return $actor->can('viewForum') && $actor->can(self::VIEW);
    }
}
