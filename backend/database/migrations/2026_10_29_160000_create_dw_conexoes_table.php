<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dw_conexoes', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 120);
            $table->string('driver', 20)->default('mysql');
            $table->string('host', 255);
            $table->unsignedInteger('port')->default(3306);
            $table->string('database', 128);
            $table->string('username', 128);
            $table->text('senha');
            $table->boolean('ssl')->default(false);
            $table->boolean('ativa')->default(true);
            $table->timestamps();
        });

        Schema::table('variaveis', function (Blueprint $table) {
            $table->foreignId('conexao_id')->nullable()->after('chave')->constrained('dw_conexoes')->nullOnDelete();
            $table->unsignedBigInteger('conexao_id_testada')->nullable()->after('consulta_sql_testada');
        });
    }

    public function down(): void
    {
        Schema::table('variaveis', function (Blueprint $table) {
            $table->dropConstrainedForeignId('conexao_id');
        });
        Schema::dropIfExists('dw_conexoes');
    }
};
