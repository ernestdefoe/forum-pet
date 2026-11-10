<?php

use Carbon\Carbon;
use ErnestDefoe\ForumPet\Milestones;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

/*
 * The pet is one row. It starts as an egg today, and its first milestone is
 * the next round post count above what the forum already has: a forum with
 * 40,000 posts should not cheer 100 the moment it installs this.
 */
return [
    'up' => function (Builder $schema) {
        $schema->create('forum_pet', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->unsignedTinyInteger('stage')->default(0);
            $table->unsignedInteger('care_total')->default(0);
            $table->dateTime('born_at');
            $table->dateTime('hatched_at')->nullable();
            $table->dateTime('grown_at')->nullable();
            $table->dateTime('ascended_at')->nullable();
            $table->unsignedBigInteger('milestone')->default(0);
            $table->dateTime('milestone_at')->nullable();
        });

        // The same posts the pet counts later (Milestones::countPosts), so the first cheer isn't skipped.
        $posts = $schema->getConnection()->table('posts')->where('type', 'comment')->whereNull('hidden_at')->where('is_private', false)
            ->when($schema->hasColumn('posts', 'is_approved'), fn ($q) => $q->where('is_approved', true))
            ->count();

        $schema->getConnection()->table('forum_pet')->insert([
            'id' => 1,
            'stage' => 0,
            'care_total' => 0,
            'born_at' => Carbon::now(),
            'milestone' => Milestones::reached($posts),
        ]);
    },
    'down' => function (Builder $schema) {
        $schema->dropIfExists('forum_pet');
    },
];
