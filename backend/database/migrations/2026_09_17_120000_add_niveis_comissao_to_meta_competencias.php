<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meta_competencias', function (Blueprint $table) {
            $table->json('niveis_comissao')->nullable()->after('valor_realizado');
        });

        $metas = DB::table('metas')->whereNotNull('niveis_comissao')->get(['id', 'niveis_comissao']);
        foreach ($metas as $meta) {
            DB::table('meta_competencias')
                ->where('meta_id', $meta->id)
                ->whereNull('niveis_comissao')
                ->update(['niveis_comissao' => $meta->niveis_comissao]);
        }
    }

    public function down(): void
    {
        Schema::table('meta_competencias', function (Blueprint $table) {
            $table->dropColumn('niveis_comissao');
        });
    }
};
