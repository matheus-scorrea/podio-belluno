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
}
