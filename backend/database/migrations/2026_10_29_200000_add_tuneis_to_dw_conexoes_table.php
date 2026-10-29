<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dw_conexoes', function (Blueprint $table) {
            $table->string('acesso', 16)->default('direto')->after('ativa');
            $table->string('ssh_host', 255)->nullable();
            $table->unsignedInteger('ssh_port')->nullable();
            $table->string('ssh_username', 128)->nullable();
            $table->string('ssh_auth', 16)->nullable();
            $table->text('ssh_senha')->nullable();
            $table->text('ssh_chave_privada')->nullable();
            $table->text('ssh_passphrase')->nullable();
            $table->string('vpn_tipo', 16)->nullable();
            $table->text('vpn_config')->nullable();
            $table->string('vpn_username', 128)->nullable();
            $table->text('vpn_senha')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('dw_conexoes', function (Blueprint $table) {
            $table->dropColumn([
                'acesso',
                'ssh_host',
                'ssh_port',
                'ssh_username',
                'ssh_auth',
                'ssh_senha',
                'ssh_chave_privada',
                'ssh_passphrase',
                'vpn_tipo',
                'vpn_config',
                'vpn_username',
                'vpn_senha',
            ]);
        });
    }
};
