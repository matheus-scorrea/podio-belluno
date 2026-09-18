<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('metas', function (Blueprint $table) {
            $table->string('modo_bonus', 20)->default('fixo')->after('valor_bonus');
            $table->decimal('bonus_piso_percentual', 8, 1)->nullable()->after('modo_bonus');
            $table->decimal('bonus_teto_percentual', 8, 1)->nullable()->after('bonus_piso_percentual');
            $table->decimal('bonus_por_unidade_extra', 15, 2)->nullable()->after('bonus_teto_percentual');
        });
    }

    public function down(): void
    {
        Schema::table('metas', function (Blueprint $table) {
            $table->dropColumn([
                'modo_bonus',
                'bonus_piso_percentual',
                'bonus_teto_percentual',
                'bonus_por_unidade_extra',
            ]);
        });
    }
};
