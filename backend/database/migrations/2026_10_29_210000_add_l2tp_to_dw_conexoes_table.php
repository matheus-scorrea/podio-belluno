<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dw_conexoes', function (Blueprint $table) {
            $table->string('vpn_servidor', 255)->nullable()->after('vpn_tipo');
            $table->text('vpn_psk')->nullable()->after('vpn_servidor');
        });
    }

    public function down(): void
    {
        Schema::table('dw_conexoes', function (Blueprint $table) {
            $table->dropColumn(['vpn_servidor', 'vpn_psk']);
        });
    }
};
