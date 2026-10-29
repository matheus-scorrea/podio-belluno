<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('metas', function (Blueprint $table) {
            $table->foreignId('cloned_from_id')->nullable()->after('created_by')->constrained('metas')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('metas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cloned_from_id');
        });
    }
};
