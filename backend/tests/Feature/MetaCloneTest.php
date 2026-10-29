<?php

namespace Tests\Feature;

use App\Models\Meta;
use App\Models\MetaCompetencia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MetaCloneTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 29)->setTime(12, 0));
    }

    public function test_direcao_clona_so_aquela_meta_para_o_proximo_mes(): void
    {
        $org = $this->createOrg();
        $nps = $this->criarMetaGlobal($org, 'NPS', 80);
        $outra = $this->criarMetaGlobal($org, 'Outra', 50);

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$nps->id}/clonar", [
            'ano' => 2026,
            'mes' => 11,
            'origem_ano' => 2026,
            'origem_mes' => 9,
        ])->assertCreated()
            ->assertJsonPath('ano', 2026)
            ->assertJsonPath('mes', 11)
            ->assertJsonPath('valor_meta', 80);

        $this->assertSame(1, Meta::query()->where('titulo', 'NPS')->count());
        $this->assertTrue(
            MetaCompetencia::query()->where('meta_id', $nps->id)->where('ano', 2026)->where('mes', 11)->exists()
        );
        $this->assertSame(
            0.0,
            (float) MetaCompetencia::query()->where('meta_id', $nps->id)->where('ano', 2026)->where('mes', 11)->value('valor_realizado')
        );
        $this->assertFalse(
            MetaCompetencia::query()->where('meta_id', $outra->id)->where('ano', 2026)->where('mes', 11)->exists()
        );
    }

    public function test_clonar_mesmo_mes_pede_recadastro_de_escopo(): void
    {
        $org = $this->createOrg();
        $meta = $this->criarMetaGlobal($org, 'NPS', 80, 2026, 10);

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/clonar", [
            'ano' => 2026,
            'mes' => 10,
            'origem_ano' => 2026,
            'origem_mes' => 10,
        ])->assertUnprocessable()
            ->assertJsonPath('errors.escopo.0', 'Esta meta já está aberta neste mês para esta equipe. Recadastre o escopo para clonar.');
    }

    public function test_clonar_mesmo_mes_com_equipe_diferente_duplica_cadastro(): void
    {
        $org = $this->createOrg();
        $meta = $this->criarMetaIndividual($org, 'Atendimento', [$org['colaborador']->id], 2026, 10);

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/clonar", [
            'ano' => 2026,
            'mes' => 10,
            'origem_ano' => 2026,
            'origem_mes' => 10,
            'tipo_escopo' => 'individual',
            'usuario_ids' => [$org['lider']->id],
        ])->assertCreated()
            ->assertJsonPath('duplicada', true);

        $this->assertSame(2, Meta::query()->where('titulo', 'Atendimento')->count());

        $copia = Meta::query()->where('titulo', 'Atendimento')->where('id', '!=', $meta->id)->firstOrFail();
        $this->assertSame($meta->id, $copia->cloned_from_id);
        $this->assertEqualsCanonicalizing(
            [$org['lider']->id],
            $copia->usuarios()->pluck('users.id')->all()
        );
        $this->assertTrue(
            MetaCompetencia::query()->where('meta_id', $copia->id)->where('ano', 2026)->where('mes', 10)->exists()
        );
        $this->assertTrue(
            MetaCompetencia::query()->where('meta_id', $meta->id)->where('ano', 2026)->where('mes', 10)->exists()
        );

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/clonar", [
            'ano' => 2026,
            'mes' => 10,
            'origem_ano' => 2026,
            'origem_mes' => 10,
            'tipo_escopo' => 'individual',
            'usuario_ids' => [$org['lider']->id],
        ])->assertUnprocessable()
            ->assertJsonPath('errors.escopo.0', 'Já existe esta meta neste mês para a mesma equipe. Recadastre o escopo.');
    }

    public function test_clonar_mesmo_mes_mesma_equipe_continua_bloqueado(): void
    {
        $org = $this->createOrg();
        $meta = $this->criarMetaIndividual($org, 'Atendimento', [$org['colaborador']->id], 2026, 10);

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/clonar", [
            'ano' => 2026,
            'mes' => 10,
            'origem_ano' => 2026,
            'origem_mes' => 10,
            'tipo_escopo' => 'individual',
            'usuario_ids' => [$org['colaborador']->id],
        ])->assertUnprocessable()
            ->assertJsonPath('errors.escopo.0', 'Já existe esta meta neste mês para a mesma equipe. Recadastre o escopo.');

        $this->assertSame(1, Meta::query()->where('titulo', 'Atendimento')->count());
    }

    public function test_clonar_global_no_mesmo_mes_exige_escopo_nao_global(): void
    {
        $org = $this->createOrg();
        $meta = $this->criarMetaGlobal($org, 'NPS', 80, 2026, 10);

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/clonar", [
            'ano' => 2026,
            'mes' => 10,
            'origem_ano' => 2026,
            'origem_mes' => 10,
            'tipo_escopo' => 'global',
        ])->assertUnprocessable();

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/clonar", [
            'ano' => 2026,
            'mes' => 10,
            'origem_ano' => 2026,
            'origem_mes' => 10,
            'tipo_escopo' => 'departamento',
            'departamento_ids' => [$org['dept']->id],
        ])->assertCreated()
            ->assertJsonPath('duplicada', true);

        $copia = Meta::query()->where('titulo', 'NPS')->where('id', '!=', $meta->id)->firstOrFail();
        $this->assertSame('departamento', $copia->tipo_escopo);
        $this->assertEqualsCanonicalizing(
            [$org['dept']->id],
            $copia->departamentos()->pluck('departamentos.id')->all()
        );
    }

    public function test_clonar_rejeita_mes_fora_da_janela(): void
    {
        $org = $this->createOrg();
        $meta = $this->criarMetaGlobal($org, 'NPS', 80);

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/clonar", [
            'ano' => 2026,
            'mes' => 12,
            'origem_ano' => 2026,
            'origem_mes' => 9,
        ])->assertUnprocessable()
            ->assertJsonPath('errors.mes.0', 'Só é possível clonar para o mês atual ou o próximo.');
    }

    public function test_colaborador_e_lider_nao_clonam_meta(): void
    {
        $org = $this->createOrg();
        $meta = $this->criarMetaGlobal($org, 'NPS', 80);

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$meta->id}/clonar", [
            'ano' => 2026,
            'mes' => 11,
        ])->assertForbidden();

        $this->actingAs($org['lider'])->postJson("/api/metas/{$meta->id}/clonar", [
            'ano' => 2026,
            'mes' => 11,
        ])->assertForbidden();
    }

    public function test_clonar_marco_copia_o_realizado(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'Implantar IAnalista',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'global',
            'valor_meta' => 1,
            'unidade' => 'marco',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'marco',
            'chart_cor' => '#00A8E8',
        ])->assertCreated();

        $meta = Meta::query()->where('titulo', 'Implantar IAnalista')->firstOrFail();
        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 1,
            'data_evento' => '2026-09-09',
        ])->assertCreated();

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/clonar", [
            'ano' => 2026,
            'mes' => 11,
            'origem_ano' => 2026,
            'origem_mes' => 9,
        ])->assertCreated();

        $this->assertSame(
            1.0,
            (float) MetaCompetencia::query()->where('meta_id', $meta->id)->where('ano', 2026)->where('mes', 11)->value('valor_realizado')
        );
    }

    private function criarMetaGlobal(array $org, string $titulo, float $alvo, int $ano = 2026, int $mes = 9): Meta
    {
        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => $titulo,
            'ano' => $ano,
            'mes' => $mes,
            'tipo_escopo' => 'global',
            'valor_meta' => $alvo,
            'unidade' => '%',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'gauge',
            'chart_cor' => '#00A8E8',
        ])->assertCreated();

        return Meta::query()->where('titulo', $titulo)->firstOrFail();
    }

    /**
     * @param  list<int>  $usuarioIds
     */
    private function criarMetaIndividual(array $org, string $titulo, array $usuarioIds, int $ano = 2026, int $mes = 9): Meta
    {
        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => $titulo,
            'ano' => $ano,
            'mes' => $mes,
            'tipo_escopo' => 'individual',
            'usuario_ids' => $usuarioIds,
            'valor_meta' => 10,
            'unidade' => 'un',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'progress_bar',
            'chart_cor' => '#00A8E8',
        ])->assertCreated();

        return Meta::query()->where('titulo', $titulo)->firstOrFail();
    }
}
