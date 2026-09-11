<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('metas', function (Blueprint $table) {
            $table->json('niveis_comissao')->nullable()->after('valor_bonus');
        });

        Schema::table('meta_lancamentos', function (Blueprint $table) {
            $table->decimal('valor_adesao', 15, 2)->nullable()->after('valor_realizado');
        });
    }

    public function down(): void
    {
        Schema::table('metas', function (Blueprint $table) {
            $table->dropColumn('niveis_comissao');
        });

        Schema::table('meta_lancamentos', function (Blueprint $table) {
            $table->dropColumn('valor_adesao');
        });
    }
};
