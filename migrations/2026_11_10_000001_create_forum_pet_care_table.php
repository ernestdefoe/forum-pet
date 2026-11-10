<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

/*
 * Who fed or played with the pet, and on which day. The unique key is the
 * once-a-day rule.
 *
 * Index and key names are short and carry the table prefix themselves:
 * Laravel's own names would pass MySQL's 64 characters under a long prefix,
 * and PostgreSQL (indexes) and MySQL (foreign keys) want them unique across
 * every forum sharing the database.
 */
return [
    'up' => function (Builder $schema) {
        $p = $schema->getConnection()->getTablePrefix();

        $schema->create('forum_pet_care', function (Blueprint $table) use ($p) {
            $table->bigIncrements('id');
            $table->unsignedInteger('user_id');
            $table->date('day');
            $table->string('kind', 8);
            $table->dateTime('created_at');

            $table->unique(['user_id', 'day', 'kind'], $p.'fpet_care_once');
            $table->index(['day', 'created_at'], $p.'fpet_care_day');
            $table->index('created_at', $p.'fpet_care_created');
            $table->foreign('user_id', $p.'fpet_care_user')->references('id')->on('users')->cascadeOnDelete();
        });
    },
    'down' => function (Builder $schema) {
        $schema->dropIfExists('forum_pet_care');
    },
];
