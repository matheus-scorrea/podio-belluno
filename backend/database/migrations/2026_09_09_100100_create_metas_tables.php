<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('metas', function (Blueprint $table) {
            $table->id();
            $table->string('titulo');
            $table->text('descricao')->nullable();
            $table->unsignedSmallInteger('ano');
            $table->unsignedTinyInteger('mes');
            $table->string('tipo_escopo', 20);
            $table->decimal('valor_meta', 15, 2);
            $table->string('unidade', 10)->default('%');
            $table->string('sentido', 20)->default('maior_melhor');
            $table->string('agregacao', 10)->default('media');
            $table->decimal('valor_realizado', 15, 2)->default(0);
            $table->string('chart_tipo', 20);
            $table->string('chart_cor', 16)->default('#00A8E8');
            $table->unsignedInteger('ordem_exibicao')->default(1);
            $table->foreignId('created_by')->constrained('users');
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['ano', 'mes']);
        });

        Schema::create('meta_usuario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meta_id')->constrained('metas')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('users')->cascadeOnDelete();
            $table->unique(['meta_id', 'usuario_id']);
        });

        Schema::create('meta_cargo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meta_id')->constrained('metas')->cascadeOnDelete();
            $table->foreignId('cargo_id')->constrained('cargos')->cascadeOnDelete();
            $table->unique(['meta_id', 'cargo_id']);
        });

        Schema::create('meta_departamento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meta_id')->constrained('metas')->cascadeOnDelete();
            $table->foreignId('departamento_id')->constrained('departamentos')->cascadeOnDelete();
            $table->unique(['meta_id', 'departamento_id']);
        });

        Schema::create('meta_lancamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meta_id')->constrained('metas')->cascadeOnDelete();
            $table->date('data_evento');
            $table->decimal('valor_realizado', 15, 2);
            $table->text('observacao')->nullable();
            $table->foreignId('departamento_id')->nullable()->constrained('departamentos')->nullOnDelete();
            $table->foreignId('cargo_id')->nullable()->constrained('cargos')->nullOnDelete();
            $table->foreignId('usuario_alvo_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('lancado_por')->constrained('users');
            $table->timestamps();

            $table->index(['meta_id', 'data_evento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_lancamentos');
        Schema::dropIfExists('meta_departamento');
        Schema::dropIfExists('meta_cargo');
        Schema::dropIfExists('meta_usuario');
        Schema::dropIfExists('metas');
    }
};
