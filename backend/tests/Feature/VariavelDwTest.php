<?php

namespace Tests\Feature;

use App\Models\Meta;
use App\Models\MetaCompetencia;
use App\Models\Variavel;
use App\Models\VariavelValor;
use App\Services\DwIndicadorService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class VariavelDwTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararDw();
    }

    public function test_lider_nao_acessa_variaveis(): void
    {
        $org = $this->createOrg();
        $this->actingAs($org['lider'])->getJson('/api/variaveis')->assertForbidden();
    }

    public function test_publicar_sem_teste_falha_e_editar_sql_volta_a_rascunho(): void
    {
        $org = $this->createOrg();
        $variavel = Variavel::factory()->create();

        $this->actingAs($org['direcao'])->postJson("/api/variaveis/{$variavel->id}/publicar")
            ->assertUnprocessable()
            ->assertJsonPath('errors.consulta_sql.0', 'Teste a consulta do mês vigente antes de publicar.');

        $this->actingAs($org['direcao'])->postJson("/api/variaveis/{$variavel->id}/testar")
            ->assertOk()
            ->assertJsonPath('valor', 42)
            ->assertJsonPath('ano', 2026)
            ->assertJsonPath('mes', 9);

        $this->actingAs($org['direcao'])->postJson("/api/variaveis/{$variavel->id}/publicar")
            ->assertOk()
            ->assertJsonPath('status', Variavel::PUBLICADA);

        $this->actingAs($org['direcao'])->putJson("/api/variaveis/{$variavel->id}", [
            'nome' => $variavel->nome,
            'unidade' => '%',
            'conexao_id' => $variavel->conexao_id,
            'consulta_sql' => 'SELECT valor FROM fato_indicadores WHERE codigo = \'nps\' AND mes = :mes AND ano = :ano',
        ])->assertOk()->assertJsonPath('status', Variavel::RASCUNHO);

        $publicadas = $this->actingAs($org['direcao'])->getJson('/api/variaveis?status=publicada')->json('data');
        $this->assertCount(0, $publicadas);
    }

    public function test_select_da_meta_lista_so_publicadas(): void
    {
        $org = $this->createOrg();
        Variavel::factory()->create(['nome' => 'Rascunho']);
        $publicada = Variavel::factory()->publicada()->create(['nome' => 'Receita']);

        $lista = $this->actingAs($org['direcao'])->getJson('/api/variaveis?status=publicada')->json('data');
        $this->assertCount(1, $lista);
        $this->assertSame($publicada->id, $lista[0]['id']);
        $this->assertArrayNotHasKey('consulta_sql', $lista[0]);
    }

    public function test_sync_atualiza_so_mes_vigente_e_nao_meta_manual(): void
    {
        $org = $this->createOrg();
        $variavel = Variavel::factory()->publicada()->create();
        $auto = $this->criarMetaComVariavel($org, $variavel);
        $manual = $this->criarMetaGlobal($org, 'Manual');

        MetaCompetencia::query()->where('meta_id', $auto->id)->update(['valor_realizado' => 1]);
        MetaCompetencia::query()->where('meta_id', $manual->id)->update(['valor_realizado' => 7]);

        $this->artisan('dw:sincronizar')->assertSuccessful();

        $this->assertEquals(42, (float) MetaCompetencia::query()->where('meta_id', $auto->id)->where('ano', 2026)->where('mes', 9)->value('valor_realizado'));
        $this->assertEquals(7, (float) MetaCompetencia::query()->where('meta_id', $manual->id)->value('valor_realizado'));
        $this->assertDatabaseHas('variavel_valores', [
            'variavel_id' => $variavel->id,
            'ano' => 2026,
            'mes' => 9,
            'congelado' => false,
        ]);
    }

    public function test_virada_congela_mes_anterior_e_nao_sobrescreve_snapshot(): void
    {
        $org = $this->createOrg();
        $variavel = Variavel::factory()->publicada()->create();
        $meta = $this->criarMetaComVariavel($org, $variavel, 2026, 9);

        app(DwIndicadorService::class)->sincronizarPublicadas();
        $this->assertEquals(42, (float) $meta->competencias()->where('mes', 9)->value('valor_realizado'));

        VariavelValor::query()->create([
            'variavel_id' => $variavel->id,
            'ano' => 2026,
            'mes' => 8,
            'valor' => 90,
            'congelado' => false,
        ]);
        $meta->competencias()->create([
            'ano' => 2026,
            'mes' => 8,
            'valor_meta' => 100,
            'valor_realizado' => 90,
        ]);

        DB::connection('dw')->table('fato_indicadores')->where('codigo', 'nps')->update(['valor' => 15]);

        $this->travelTo(now()->setDate(2026, 10, 1)->setTime(8, 0));
        app(DwIndicadorService::class)->sincronizarPublicadas();

        $this->assertTrue((bool) VariavelValor::query()->where('variavel_id', $variavel->id)->where('mes', 9)->value('congelado'));
        $this->assertEquals(42, (float) VariavelValor::query()->where('variavel_id', $variavel->id)->where('mes', 9)->value('valor'));
        $this->assertEquals(42, (float) $meta->competencias()->where('mes', 9)->value('valor_realizado'));
        $this->assertEquals(90, (float) VariavelValor::query()->where('variavel_id', $variavel->id)->where('mes', 8)->value('valor'));
        $this->assertTrue((bool) VariavelValor::query()->where('variavel_id', $variavel->id)->where('mes', 8)->value('congelado'));

        $outubro = VariavelValor::query()->where('variavel_id', $variavel->id)->where('mes', 10)->first();
        $this->assertNotNull($outubro);
        $this->assertFalse($outubro->congelado);
        $this->assertEquals(15, (float) $outubro->valor);
    }

    public function test_lancamento_em_meta_vinculada_falha_e_some_de_lancaveis(): void
    {
        $org = $this->createOrg();
        $variavel = Variavel::factory()->publicada()->create();
        $meta = $this->criarMetaComVariavel($org, $variavel);

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 10,
            'data_evento' => '2026-09-15',
        ])->assertUnprocessable();

        $lancaveis = collect($this->actingAs($org['lider'])->getJson('/api/metas/lancaveis?ano=2026&mes=9')->json('data'))
            ->pluck('id');
        $this->assertFalse($lancaveis->contains($meta->id));
    }

    public function test_clone_preserva_variavel_id(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 29)->setTime(12, 0));
        $org = $this->createOrg();
        $variavel = Variavel::factory()->publicada()->create();
        $meta = $this->criarMetaComVariavel($org, $variavel, 2026, 10);

        $copia = $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/clonar", [
            'ano' => 2026,
            'mes' => 10,
            'origem_ano' => 2026,
            'origem_mes' => 10,
            'tipo_escopo' => 'departamento',
            'departamento_ids' => [$org['dept']->id],
        ])->assertCreated()->json();

        $nova = Meta::query()->findOrFail($copia['meta_id']);
        $this->assertSame($variavel->id, $nova->variavel_id);
    }

    public function test_meta_comissao_nao_aceita_variavel(): void
    {
        $org = $this->createOrg();
        $variavel = Variavel::factory()->publicada()->create();

        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'Comissão',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'cargo',
            'cargo_ids' => [$org['comumCargo']->id],
            'valor_meta' => 1,
            'unidade' => 'R$',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'comissao',
            'chart_cor' => '#00A8E8',
            'variavel_id' => $variavel->id,
            'niveis_comissao' => [[
                'nome' => 'N1',
                'venda_min' => 1000,
                'adesao_min' => 0,
                'percentual' => 1,
                'premio' => 0,
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors('variavel_id');
    }

    private function prepararDw(): void
    {
        Schema::connection('dw')->dropIfExists('fato_indicadores');
        Schema::connection('dw')->create('fato_indicadores', function (Blueprint $table) {
            $table->string('codigo');
            $table->unsignedSmallInteger('ano');
            $table->unsignedTinyInteger('mes');
            $table->decimal('valor', 15, 2);
        });
        DB::connection('dw')->table('fato_indicadores')->insert([
            'codigo' => 'nps',
            'ano' => 2026,
            'mes' => 9,
            'valor' => 42,
        ]);
        DB::connection('dw')->table('fato_indicadores')->insert([
            'codigo' => 'nps',
            'ano' => 2026,
            'mes' => 10,
            'valor' => 15,
        ]);
    }

    private function criarMetaGlobal(array $org, string $titulo): Meta
    {
        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => $titulo,
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'global',
            'valor_meta' => 100,
            'unidade' => '%',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'gauge',
            'chart_cor' => '#00A8E8',
        ])->assertCreated();

        return Meta::query()->where('titulo', $titulo)->firstOrFail();
    }

    private function criarMetaComVariavel(array $org, Variavel $variavel, int $ano = 2026, int $mes = 9): Meta
    {
        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'Auto '.$variavel->id,
            'ano' => $ano,
            'mes' => $mes,
            'tipo_escopo' => 'global',
            'valor_meta' => 100,
            'unidade' => '%',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'gauge',
            'chart_cor' => '#00A8E8',
            'variavel_id' => $variavel->id,
        ])->assertCreated();

        return Meta::query()->where('variavel_id', $variavel->id)->latest('id')->firstOrFail();
    }
}
