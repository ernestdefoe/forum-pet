<?php

use Flarum\Group\Group;
use Illuminate\Database\Schema\Builder;

/*
 * Members feed and play with the pet. Who may see it follows who may see the
 * forum: guests only when guests can already view the forum, so a forum closed
 * to guests doesn't show them the pet or its caretakers.
 */
return [
    'up' => function (Builder $schema) {
        $db = $schema->getConnection();
        $guestsSeeForum = $db->table('group_permission')->where('group_id', Group::GUEST_ID)->where('permission', 'viewForum')->exists();

        foreach ([
            'forumPet.view' => $guestsSeeForum ? Group::GUEST_ID : Group::MEMBER_ID,
            'forumPet.care' => Group::MEMBER_ID,
        ] as $permission => $group) {
            $db->table('group_permission')->updateOrInsert(['group_id' => $group, 'permission' => $permission]);
        }
    },
    'down' => function (Builder $schema) {
        $schema->getConnection()->table('group_permission')->whereIn('permission', ['forumPet.view', 'forumPet.care'])->delete();
    },
];
