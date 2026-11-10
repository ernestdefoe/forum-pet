<?php

use Flarum\Database\Migration;
use Illuminate\Database\Schema\Blueprint;

/*
 * Who fed or played with the pet, and on which day. The unique key is the
 * once-a-day rule. Index and key names are Laravel's own: they carry the
 * table prefix, so forums sharing a database never collide.
 */
return Migration::createTable('forum_pet_care', function (Blueprint $table) {
    $table->bigIncrements('id');
    $table->unsignedInteger('user_id');
    $table->date('day');
    $table->string('kind', 8);
    $table->dateTime('created_at');

    $table->unique(['user_id', 'day', 'kind']);
    $table->index(['day', 'created_at']);
    $table->index('created_at');
    $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
});
