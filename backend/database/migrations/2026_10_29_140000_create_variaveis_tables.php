<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('variaveis', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 180);
            $table->string('chave', 80)->unique();
            $table->string('unidade', 8);
            $table->text('descricao')->nullable();
            $table->text('consulta_sql');
            $table->text('consulta_sql_testada')->nullable();
            $table->string('status', 20)->default('rascunho');
            $table->text('ultimo_erro')->nullable();
            $table->timestamp('testado_em')->nullable();
            $table->timestamp('sincronizado_em')->nullable();
            $table->timestamps();
        });

        Schema::create('variavel_valores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variavel_id')->constrained('variaveis')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano');
            $table->unsignedTinyInteger('mes');
            $table->decimal('valor', 15, 2);
            $table->boolean('congelado')->default(false);
            $table->timestamps();

            $table->unique(['variavel_id', 'ano', 'mes']);
            $table->index(['ano', 'mes']);
        });

        Schema::table('metas', function (Blueprint $table) {
            $table->foreignId('variavel_id')->nullable()->after('cloned_from_id')->constrained('variaveis')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('metas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('variavel_id');
        });
        Schema::dropIfExists('variavel_valores');
        Schema::dropIfExists('variaveis');
    }
};
