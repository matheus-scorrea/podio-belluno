<?php

namespace Tests\Feature;

use App\Models\DwConexao;
use App\Models\Variavel;
use App\Services\DwIndicadorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DwConexaoTest extends TestCase
{
    use RefreshDatabase;

    public function test_lider_nao_acessa_conexoes(): void
    {
        $org = $this->createOrg();
        $this->actingAs($org['lider'])->getJson('/api/conexoes')->assertForbidden();
    }

    public function test_cria_conexao_sem_devolver_senha_e_cifra_no_banco(): void
    {
        $org = $this->createOrg();

        $resposta = $this->actingAs($org['direcao'])->postJson('/api/conexoes', [
            'nome' => 'Warehouse',
            'driver' => 'mysql',
            'host' => 'dw.interno',
            'port' => 3306,
            'database' => 'indicadores',
            'username' => 'readonly',
            'senha' => 'super-secret',
            'ssl' => false,
        ])->assertCreated();

        $resposta->assertJsonMissingPath('senha')
            ->assertJsonPath('tem_senha', true)
            ->assertJsonPath('host', 'dw.interno');

        $conexao = DwConexao::query()->firstOrFail();
        $this->assertNotSame('super-secret', $conexao->getAttributes()['senha']);
        $this->assertSame('super-secret', $conexao->senhaPura());
    }

    public function test_editar_sem_senha_mantem_a_anterior(): void
    {
        $org = $this->createOrg();
        $conexao = DwConexao::factory()->create([
            'driver' => 'mysql',
            'host' => 'dw.interno',
            'database' => 'indicadores',
            'senha' => 'primeira',
        ]);

        $this->actingAs($org['direcao'])->putJson("/api/conexoes/{$conexao->id}", [
            'nome' => 'Warehouse 2',
            'driver' => 'mysql',
            'host' => 'dw.interno',
            'port' => 3306,
            'database' => 'indicadores',
            'username' => 'readonly',
            'ssl' => false,
        ])->assertOk()->assertJsonPath('nome', 'Warehouse 2');

        $this->assertSame('primeira', $conexao->fresh()->senhaPura());
    }

    public function test_nao_exclui_conexao_em_uso(): void
    {
        $org = $this->createOrg();
        $variavel = Variavel::factory()->create();

        $this->actingAs($org['direcao'])->deleteJson("/api/conexoes/{$variavel->conexao_id}")
            ->assertUnprocessable();
    }

    public function test_testar_conexao_sqlite_de_teste_funciona(): void
    {
        $conexao = DwConexao::factory()->create();
        app(DwIndicadorService::class)->testarConexao($conexao);
        $this->assertTrue(true);
    }

    public function test_cria_conexao_ssh_cifra_chave_e_nao_devolve_segredo(): void
    {
        $org = $this->createOrg();
        $chave = "-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----";

        $resposta = $this->actingAs($org['direcao'])->postJson('/api/conexoes', [
            'nome' => 'DW via jump',
            'driver' => 'mysql',
            'host' => '127.0.0.1',
            'port' => 3306,
            'database' => 'indicadores',
            'username' => 'readonly',
            'senha' => 'db-secret',
            'acesso' => 'ssh',
            'ssh_host' => 'bastion.interno',
            'ssh_port' => 22,
            'ssh_username' => 'tunel',
            'ssh_auth' => 'chave',
            'ssh_chave_privada' => $chave,
        ])->assertCreated();

        $resposta->assertJsonPath('acesso', 'ssh')
            ->assertJsonPath('tem_ssh_chave', true)
            ->assertJsonMissingPath('ssh_chave_privada')
            ->assertJsonMissingPath('senha');

        $conexao = DwConexao::query()->firstOrFail();
        $this->assertNotSame($chave, $conexao->getAttributes()['ssh_chave_privada']);
        $this->assertSame($chave, $conexao->segredoPuro('ssh_chave_privada'));
    }

    public function test_rejeita_host_ssh_com_metachar(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/conexoes', [
            'nome' => 'Ruim',
            'driver' => 'mysql',
            'host' => '127.0.0.1',
            'port' => 3306,
            'database' => 'indicadores',
            'username' => 'readonly',
            'senha' => 'db-secret',
            'acesso' => 'ssh',
            'ssh_host' => 'bastion; rm -rf /',
            'ssh_port' => 22,
            'ssh_username' => 'tunel',
            'ssh_auth' => 'chave',
            'ssh_chave_privada' => 'chave',
        ])->assertUnprocessable()->assertJsonValidationErrors(['ssh_host']);
    }

    public function test_cria_conexao_l2tp_cifra_psk_e_nao_devolve_segredo(): void
    {
        $org = $this->createOrg();

        $resposta = $this->actingAs($org['direcao'])->postJson('/api/conexoes', [
            'nome' => 'DW via L2TP',
            'driver' => 'mysql',
            'host' => '10.1.2.3',
            'port' => 3306,
            'database' => 'indicadores',
            'username' => 'readonly',
            'senha' => 'db-secret',
            'acesso' => 'vpn',
            'vpn_tipo' => 'l2tp',
            'vpn_servidor' => 'vpn.interno',
            'vpn_psk' => 'psk-secreta',
            'vpn_username' => 'tunel',
            'vpn_senha' => 'vpn-pass',
        ])->assertCreated();

        $resposta->assertJsonPath('acesso', 'vpn')
            ->assertJsonPath('vpn_tipo', 'l2tp')
            ->assertJsonPath('vpn_servidor', 'vpn.interno')
            ->assertJsonPath('tem_vpn_psk', true)
            ->assertJsonPath('tem_vpn_senha', true)
            ->assertJsonMissingPath('vpn_psk')
            ->assertJsonMissingPath('vpn_senha')
            ->assertJsonMissingPath('senha');

        $conexao = DwConexao::query()->firstOrFail();
        $this->assertNotSame('psk-secreta', $conexao->getAttributes()['vpn_psk']);
        $this->assertSame('psk-secreta', $conexao->segredoPuro('vpn_psk'));
        $this->assertSame('vpn-pass', $conexao->segredoPuro('vpn_senha'));
    }

    public function test_rejeita_servidor_l2tp_com_metachar(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/conexoes', [
            'nome' => 'L2TP ruim',
            'driver' => 'mysql',
            'host' => '10.1.2.3',
            'port' => 3306,
            'database' => 'indicadores',
            'username' => 'readonly',
            'senha' => 'db-secret',
            'acesso' => 'vpn',
            'vpn_tipo' => 'l2tp',
            'vpn_servidor' => 'vpn; rm -rf /',
            'vpn_psk' => 'psk',
            'vpn_username' => 'tunel',
            'vpn_senha' => 'vpn-pass',
        ])->assertUnprocessable()->assertJsonValidationErrors(['vpn_servidor']);
    }

    public function test_l2tp_nao_exige_arquivo_de_config(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/conexoes', [
            'nome' => 'L2TP sem ovpn',
            'driver' => 'mysql',
            'host' => '10.1.2.3',
            'port' => 3306,
            'database' => 'indicadores',
            'username' => 'readonly',
            'senha' => 'db-secret',
            'acesso' => 'vpn',
            'vpn_tipo' => 'l2tp',
            'vpn_servidor' => 'vpn.interno',
            'vpn_psk' => 'psk',
            'vpn_username' => 'tunel',
            'vpn_senha' => 'vpn-pass',
        ])->assertCreated()->assertJsonMissingPath('vpn_config');
    }

    public function test_rejeita_wireguard_com_postup(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/conexoes', [
            'nome' => 'VPN ruim',
            'driver' => 'mysql',
            'host' => '10.1.2.3',
            'port' => 3306,
            'database' => 'indicadores',
            'username' => 'readonly',
            'senha' => 'db-secret',
            'acesso' => 'vpn',
            'vpn_tipo' => 'wireguard',
            'vpn_config' => "[Interface]\nPrivateKey = aaa=\nAddress = 10.10.0.2/32\nPostUp = id\n[Peer]\nPublicKey = bbb=\nEndpoint = vpn.exemplo.com:51820\n",
        ])->assertUnprocessable()->assertJsonValidationErrors(['vpn_config']);
    }
}
