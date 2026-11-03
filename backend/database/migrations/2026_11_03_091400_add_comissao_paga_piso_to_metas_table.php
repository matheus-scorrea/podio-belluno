<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('metas', function (Blueprint $table) {
            $table->boolean('comissao_paga_piso')->default(false)->after('marco_por_pessoa');
        });
    }

    public function down(): void
    {
        Schema::table('metas', function (Blueprint $table) {
            $table->dropColumn('comissao_paga_piso');
        });
    }
};
