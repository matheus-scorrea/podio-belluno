<?php

namespace Tests\Feature;

use App\Models\Cargo;
use App\Models\Meta;
use App\Models\MetaLancamento;
use App\Models\User;
use App\Models\UsuarioCompetencia;
use App\Services\CompetenciaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeusResultadosTest extends TestCase
{
    use RefreshDatabase;

    public function test_qualquer_perfil_autenticado_ve_os_proprios_resultados(): void
    {
        $org = $this->createOrg();
        $this->metaIndividual($org, 100);

        $this->actingAs($org['colaborador'])->getJson('/api/me/resultados?ano=2026')->assertOk();
        $this->actingAs($org['lider'])->getJson('/api/me/resultados?ano=2026')->assertOk();
        $this->actingAs($org['direcao'])->getJson('/api/me/resultados?ano=2026')->assertOk();
    }

    public function test_colaborador_nao_ve_meta_de_outra_pessoa(): void
    {
        $org = $this->createOrg();
        $this->metaIndividual($org, 100, 'Meta da Ana');

        $colega = User::factory()->create([
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ]);
        $metaColega = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => 'Meta do colega',
            'valor_bonus' => 80,
        ]);
        $metaColega->usuarios()->sync([$colega->id]);
        $this->bater($metaColega);

        $response = $this->actingAs($org['colaborador'])->getJson('/api/me/resultados?ano=2026');

        $response->assertOk();
        $titulos = collect($response->json('meses.0.itens'))->pluck('titulo');
        $this->assertTrue($titulos->contains('Meta da Ana'));
        $this->assertFalse($titulos->contains('Meta do colega'));
    }

    public function test_bonus_por_meta_batida_em_varios_meses(): void
    {
        $org = $this->createOrg();
        $relacionamento = $this->metaIndividual($org, 180, 'Relacionamento');
        $reunioes = $this->metaIndividual($org, 250, 'Reuniões');
        $competencias = app(CompetenciaService::class);

        $competencias->upsert($relacionamento, 2026, 1, 100);
        $competencias->upsert($reunioes, 2026, 1, 100);
        $competencias->upsert($relacionamento, 2026, 2, 100);
        $competencias->upsert($reunioes, 2026, 2, 100);

        $relacionamento->competencias()->whereIn('mes', [1, 2])->update(['valor_realizado' => 100]);
        $reunioes->competencias()->where('mes', 2)->update(['valor_realizado' => 100]);
        $relacionamento->unsetRelation('competencias');
        $reunioes->unsetRelation('competencias');

        $response = $this->actingAs($org['colaborador'])->getJson('/api/me/resultados?ano=2026');
        $meses = collect($response->json('meses'));
        $janeiro = $meses->firstWhere('mes', 1);
        $fevereiro = $meses->firstWhere('mes', 2);

        $this->assertSame(1, $janeiro['batidas']);
        $this->assertEquals(180, $janeiro['bonus_total']);
        $this->assertSame(2, $fevereiro['batidas']);
        $this->assertEquals(430, $fevereiro['bonus_total']);
    }

    public function test_inclui_meta_nao_batida(): void
    {
        $org = $this->createOrg();
        $batida = $this->metaIndividual($org, 100, 'Meta batida');
        $this->bater($batida);
        $this->metaIndividual($org, 50, 'Meta pendente');

        $response = $this->actingAs($org['colaborador'])->getJson('/api/me/resultados?ano=2026');

        $response->assertOk()
            ->assertJsonPath('kpis.metas', 2)
            ->assertJsonPath('kpis.batidas', 1)
            ->assertJsonPath('meses.0.total_metas', 2)
            ->assertJsonPath('meses.0.batidas', 1)
            ->assertJsonPath('meses.0.bonus_total', 100);

        $itens = collect($response->json('meses.0.itens'))->keyBy('titulo');
        $this->assertTrue($itens['Meta batida']['bateu']);
        $this->assertEquals(100, $itens['Meta batida']['valor_bonus']);
        $this->assertFalse($itens['Meta pendente']['bateu']);
        $this->assertEquals(0, $itens['Meta pendente']['valor_bonus']);
    }

    public function test_abrir_competencia_grava_retrato_que_nao_muda_depois(): void
    {
        $org = $this->createOrg();
        $this->metaIndividual($org, 100);

        app(CompetenciaService::class)->abrir(2026, 10, 2026, 9);

        $retrato = UsuarioCompetencia::query()
            ->where('user_id', $org['colaborador']->id)
            ->where('ano', 2026)
            ->where('mes', 10)
            ->first();

        $this->assertNotNull($retrato);
        $this->assertSame($org['dept']->id, $retrato->departamento_id);
        $this->assertSame($org['comumCargo']->id, $retrato->cargo_id);

        $org['colaborador']->update([
            'departamento_id' => $org['outro']->id,
            'cargo_id' => Cargo::factory()->create([
                'nome' => 'Analista de RH',
                'departamento_id' => $org['outro']->id,
            ])->id,
        ]);

        $response = $this->actingAs($org['colaborador']->fresh())->getJson('/api/me/resultados?ano=2026');
        $outubro = collect($response->json('meses'))->firstWhere('mes', 10);

        $this->assertSame('TI', $outubro['departamento']);
        $this->assertSame('Analista de TI', $outubro['cargo']);
    }

    public function test_mes_sem_retrato_usa_lancamento_e_persiste(): void
    {
        $org = $this->createOrg();
        $this->metaIndividual($org, 100);

        $this->assertNull(
            UsuarioCompetencia::query()
                ->where('user_id', $org['colaborador']->id)
                ->where('ano', 2026)
                ->where('mes', 9)
                ->first()
        );

        $cargoRh = Cargo::factory()->create([
            'nome' => 'Executivo de CS',
            'departamento_id' => $org['outro']->id,
        ]);

        MetaLancamento::query()->create([
            'meta_id' => Meta::query()->first()->id,
            'data_evento' => '2026-09-15',
            'valor_realizado' => 10,
            'departamento_id' => $org['outro']->id,
            'cargo_id' => $cargoRh->id,
            'usuario_alvo_id' => $org['colaborador']->id,
            'lancado_por' => $org['colaborador']->id,
        ]);

        $response = $this->actingAs($org['colaborador'])->getJson('/api/me/resultados?ano=2026');
        $setembro = collect($response->json('meses'))->firstWhere('mes', 9);

        $this->assertSame('RH', $setembro['departamento']);
        $this->assertSame('Executivo de CS', $setembro['cargo']);

        $this->assertDatabaseHas('usuario_competencias', [
            'user_id' => $org['colaborador']->id,
            'ano' => 2026,
            'mes' => 9,
            'departamento_id' => $org['outro']->id,
            'cargo_id' => $cargoRh->id,
        ]);
    }

    /**
     * @param  array<string, mixed>  $org
     */
    private function metaIndividual(array $org, float $bonus, string $titulo = 'Meta da Ana'): Meta
    {
        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => $titulo,
            'valor_bonus' => $bonus,
        ]);
        $meta->usuarios()->sync([$org['colaborador']->id]);

        return $meta;
    }

    private function bater(Meta $meta, float $valor = 100): void
    {
        $meta->competencias()
            ->where('ano', 2026)
            ->where('mes', 9)
            ->update(['valor_realizado' => $valor]);
        $meta->unsetRelation('competencias');
    }
}
