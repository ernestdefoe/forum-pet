<?php

use Flarum\Database\Migration;
use Flarum\Group\Group;

// Anyone may visit the pet; members feed and play with it.
return Migration::addPermissions([
    'forumPet.view' => Group::GUEST_ID,
    'forumPet.care' => Group::MEMBER_ID,
]);
