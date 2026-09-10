<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meta_competencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meta_id')->constrained('metas')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano');
            $table->unsignedTinyInteger('mes');
            $table->decimal('valor_meta', 15, 2);
            $table->decimal('valor_realizado', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['meta_id', 'ano', 'mes']);
            $table->index(['ano', 'mes']);
        });

        if (Schema::hasColumn('metas', 'ano')) {
            $metas = DB::table('metas')->get();
            foreach ($metas as $meta) {
                DB::table('meta_competencias')->insert([
                    'meta_id' => $meta->id,
                    'ano' => $meta->ano,
                    'mes' => $meta->mes,
                    'valor_meta' => $meta->valor_meta,
                    'valor_realizado' => $meta->valor_realizado,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Schema::table('metas', function (Blueprint $table) {
                $table->dropIndex(['ano', 'mes']);
                $table->dropColumn(['ano', 'mes', 'valor_meta', 'valor_realizado']);
            });
        }
    }

    public function down(): void
    {
        Schema::table('metas', function (Blueprint $table) {
            $table->unsignedSmallInteger('ano')->default(2026)->after('descricao');
            $table->unsignedTinyInteger('mes')->default(1)->after('ano');
            $table->decimal('valor_meta', 15, 2)->default(0)->after('tipo_escopo');
            $table->decimal('valor_realizado', 15, 2)->default(0)->after('agregacao');
            $table->index(['ano', 'mes']);
        });

        Schema::dropIfExists('meta_competencias');
    }
};
