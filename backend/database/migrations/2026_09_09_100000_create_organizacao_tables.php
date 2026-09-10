<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departamentos', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('cargos', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->foreignId('departamento_id')->constrained('departamentos');
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('departamentos', function (Blueprint $table) {
            $table->foreignId('cargo_lider_id')->nullable()->after('nome')->constrained('cargos')->nullOnDelete();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_direcao')->default(false)->after('password');
            $table->boolean('ativo')->default(true)->after('is_direcao');
            $table->foreignId('departamento_id')->nullable()->after('ativo')->constrained('departamentos')->nullOnDelete();
            $table->foreignId('cargo_id')->nullable()->after('departamento_id')->constrained('cargos')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cargo_id');
            $table->dropConstrainedForeignId('departamento_id');
            $table->dropColumn(['is_direcao', 'ativo']);
        });

        Schema::table('departamentos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cargo_lider_id');
        });

        Schema::dropIfExists('cargos');
        Schema::dropIfExists('departamentos');
    }
};
