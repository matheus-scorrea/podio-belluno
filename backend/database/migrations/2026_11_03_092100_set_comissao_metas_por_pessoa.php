<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('metas')->where('chart_tipo', 'comissao')->update(['marco_por_pessoa' => true]);
    }

    public function down(): void
    {
        // Metas de comissão já existentes passam a ser por pessoa; não reverte.
    }
};
