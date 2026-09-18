<?php

namespace Tests\Feature;

use App\Models\Meta;
use App\Models\User;
use App\Services\ComissaoService;
use App\Support\BonusPagamento;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModoBonusFluxoTest extends TestCase
{
    use RefreshDatabase;

    public function test_direcao_persiste_e_edita_modo_unidade(): void
    {
        $org = $this->createOrg();

        $criada = $this->actingAs($org['direcao'])->postJson('/api/metas', $this->payloadQuantitativa($org, [
            'titulo' => 'Reuniões ilimitadas',
            'modo_bonus' => 'unidade',
            'valor_bonus' => 200,
            'bonus_por_unidade_extra' => 25,
            'unidade' => 'un',
            'valor_meta' => 10,
        ]))->assertCreated();

        $criada->assertJsonPath('modo_bonus', 'unidade')
            ->assertJsonPath('bonus_por_unidade_extra', '25.00')
            ->assertJsonPath('bonus_piso_percentual', null);

        $id = $criada->json('id');
        $this->actingAs($org['direcao'])->putJson("/api/metas/{$id}", $this->payloadQuantitativa($org, [
            'titulo' => 'Reuniões ilimitadas',
            'modo_bonus' => 'linear',
            'valor_bonus' => 200,
            'bonus_piso_percentual' => 100,
            'bonus_teto_percentual' => 200,
            'unidade' => 'un',
            'valor_meta' => 10,
        ]))->assertOk()
            ->assertJsonPath('modo_bonus', 'linear')
            ->assertJsonPath('bonus_teto_percentual', '200.0')
            ->assertJsonPath('bonus_por_unidade_extra', null);
    }

    public function test_direcao_persiste_faixa_unidade_e_por_unidade(): void
    {
        $org = $this->createOrg();

        $faixa = $this->actingAs($org['direcao'])->postJson('/api/metas', $this->payloadQuantitativa($org, [
            'titulo' => 'Reuniões SDR',
            'modo_bonus' => 'faixa_unidade',
            'niveis_faixa' => BonusPagamento::tabelaSdrReunioes(),
            'unidade' => 'un',
            'valor_meta' => 20,
            'valor_bonus' => 0,
        ]))->assertCreated();

        $faixa->assertJsonPath('modo_bonus', 'faixa_unidade')
            ->assertJsonPath('niveis_faixa.0.quantidade_min', 20)
            ->assertJsonPath('niveis_faixa.2.valor_por_unidade', 15)
            ->assertJsonPath('bonus_piso_percentual', null);

        $this->actingAs($org['direcao'])->postJson('/api/metas', $this->payloadQuantitativa($org, [
            'titulo' => 'Contratos SDR',
            'modo_bonus' => 'por_unidade',
            'valor_bonus' => 50,
            'unidade' => 'un',
            'valor_meta' => 1,
        ]))->assertCreated()
            ->assertJsonPath('modo_bonus', 'por_unidade')
            ->assertJsonPath('valor_bonus', '50.00')
            ->assertJsonPath('niveis_faixa', null);

        $this->actingAs($org['direcao'])->postJson('/api/metas', $this->payloadQuantitativa($org, [
            'modo_bonus' => 'faixa_unidade',
        ]))->assertUnprocessable()->assertJsonValidationErrors('niveis_faixa');
    }

    public function test_marco_e_comissao_nao_aceitam_bonus_proporcional(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/metas', $this->payloadQuantitativa($org, [
            'titulo' => 'Marco linear',
            'chart_tipo' => 'marco',
            'modo_bonus' => 'linear',
            'departamento_ids' => [$org['dept']->id],
            'tipo_escopo' => 'departamento',
        ]))->assertUnprocessable()->assertJsonValidationErrors('modo_bonus');

        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'Comissão linear',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'individual',
            'valor_meta' => 15000,
            'valor_bonus' => 0,
            'modo_bonus' => 'linear',
            'unidade' => 'R$',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'comissao',
            'chart_cor' => '#00A8E8',
            'usuario_ids' => [$org['colaborador']->id],
            'niveis_comissao' => ComissaoService::tabelaBelluno(),
        ])->assertUnprocessable()->assertJsonValidationErrors('modo_bonus');
    }

    public function test_menor_melhor_nao_aceita_bonus_acima_do_piso(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/metas', $this->payloadQuantitativa($org, [
            'sentido' => 'menor_melhor',
            'modo_bonus' => 'linear',
        ]))->assertUnprocessable()->assertJsonValidationErrors('modo_bonus');
    }

    public function test_teto_menor_que_piso_e_rejeitado(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/metas', $this->payloadQuantitativa($org, [
            'modo_bonus' => 'linear',
            'bonus_piso_percentual' => 100,
            'bonus_teto_percentual' => 80,
        ]))->assertUnprocessable()->assertJsonValidationErrors('bonus_teto_percentual');
    }

    public function test_dashboard_mostra_percentual_acima_de_cem_no_modo_linear(): void
    {
        $org = $this->createOrg();
        $linear = $this->metaIndividual($org, 200, 'Linear');
        $linear->update(['modo_bonus' => 'linear', 'bonus_piso_percentual' => 100]);
        $this->bater($linear, 150);

        $fixo = $this->metaIndividual($org, 80, 'Fixo');
        $this->bater($fixo, 150);

        $dash = $this->actingAs($org['colaborador'])->getJson('/api/dashboard?ano=2026&mes=9&visao=me');
        $dash->assertOk();

        $itemLinear = collect($dash->json('metas'))->firstWhere('titulo', 'Linear');
        $itemFixo = collect($dash->json('metas'))->firstWhere('titulo', 'Fixo');

        $this->assertEquals(150, $itemLinear['percentual']);
        $this->assertSame('concluida', $itemLinear['status']);
        $this->assertArrayNotHasKey('valor_bonus', $itemLinear);
        $this->assertArrayNotHasKey('modo_bonus', $itemLinear);

        $this->assertEquals(100, $itemFixo['percentual']);
        $this->assertSame('concluida', $itemFixo['status']);
    }

    public function test_dashboard_serie_por_pessoa_nao_corta_atingimento_linear(): void
    {
        $org = $this->createOrg();
        $colega = User::factory()->create([
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ]);

        $id = $this->actingAs($org['direcao'])->postJson('/api/metas', $this->payloadQuantitativa($org, [
            'titulo' => 'Atendimentos linear',
            'tipo_escopo' => 'individual',
            'usuario_ids' => [$org['colaborador']->id, $colega->id],
            'marco_por_pessoa' => true,
            'modo_bonus' => 'linear',
            'valor_bonus' => 200,
            'unidade' => 'un',
        ]))->assertCreated()->json('id');

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$id}/lancamentos", [
            'valor_realizado' => 150,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['colaborador']->id,
        ])->assertCreated();

        $dash = $this->actingAs($org['direcao'])->getJson('/api/dashboard?ano=2026&mes=9');
        $item = collect($dash->json('metas'))->firstWhere('titulo', 'Atendimentos linear');
        $series = collect($item['series']);

        $this->assertEquals(150, $series->firstWhere('usuario_alvo_id', $org['colaborador']->id)['percentual']);
        $this->assertEquals(0, $series->firstWhere('usuario_alvo_id', $colega->id)['percentual']);
    }

    public function test_fechamento_paga_entre_piso_e_alvo_no_modo_linear(): void
    {
        $org = $this->createOrg();
        $meta = $this->metaIndividual($org, 200);
        $meta->update([
            'modo_bonus' => 'linear',
            'bonus_piso_percentual' => 80,
        ]);
        $this->bater($meta, 90);

        $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')
            ->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('total_bonus', 180)
            ->assertJsonPath('usuarios.0.itens.0.percentual', 90)
            ->assertJsonPath('usuarios.0.itens.0.valor_bonus', 180);
    }

    public function test_fechamento_por_pessoa_paga_so_quem_passou_do_piso_linear(): void
    {
        $org = $this->createOrg();
        $colega = User::factory()->create([
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ]);

        $id = $this->actingAs($org['direcao'])->postJson('/api/metas', $this->payloadQuantitativa($org, [
            'titulo' => 'Atendimentos linear',
            'tipo_escopo' => 'individual',
            'usuario_ids' => [$org['colaborador']->id, $colega->id],
            'marco_por_pessoa' => true,
            'modo_bonus' => 'linear',
            'valor_bonus' => 200,
            'unidade' => 'un',
        ]))->assertCreated()->json('id');

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$id}/lancamentos", [
            'valor_realizado' => 150,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['colaborador']->id,
        ])->assertCreated();

        $this->actingAs($colega)->postJson("/api/metas/{$id}/lancamentos", [
            'valor_realizado' => 80,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $colega->id,
        ])->assertCreated();

        $response = $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9');
        $ids = collect($response->json('usuarios'))->pluck('id');

        $response->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('total_bonus', 300);
        $this->assertTrue($ids->contains($org['colaborador']->id));
        $this->assertFalse($ids->contains($colega->id));
    }

    public function test_fechamento_comparativa_paga_proporcional_por_pessoa(): void
    {
        $org = $this->createOrg();
        $colega = User::factory()->create([
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ]);

        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'chart_tipo' => 'column',
            'titulo' => 'Comparativa linear',
            'valor_bonus' => 100,
            'modo_bonus' => 'linear',
            'bonus_piso_percentual' => 100,
        ]);
        $meta->usuarios()->sync([$org['colaborador']->id, $colega->id]);

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 150,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['colaborador']->id,
            'departamento_id' => $org['colaborador']->departamento_id,
        ])->assertCreated();

        $response = $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9');
        $ana = collect($response->json('usuarios'))->firstWhere('id', $org['colaborador']->id);

        $this->assertNotNull($ana);
        $this->assertEquals(150, $ana['bonus_total']);
        $this->assertFalse(collect($response->json('usuarios'))->pluck('id')->contains($colega->id));
    }

    public function test_meus_resultados_reflete_bonus_linear_e_unidade(): void
    {
        $org = $this->createOrg();

        $linear = $this->metaIndividual($org, 200, 'Linear');
        $linear->update(['modo_bonus' => 'linear', 'bonus_piso_percentual' => 100]);
        $this->bater($linear, 150);

        $unidade = $this->metaIndividual($org, 200, 'Unidade');
        $unidade->update(['modo_bonus' => 'unidade', 'bonus_por_unidade_extra' => 25]);
        $unidade->competencias()->where('ano', 2026)->where('mes', 9)->update([
            'valor_meta' => 10,
            'valor_realizado' => 14,
        ]);
        $unidade->unsetRelation('competencias');

        $pendente = $this->metaIndividual($org, 80, 'Pendente linear');
        $pendente->update(['modo_bonus' => 'linear', 'bonus_piso_percentual' => 80]);
        $this->bater($pendente, 50);

        $response = $this->actingAs($org['colaborador'])->getJson('/api/me/resultados?ano=2026');
        $itens = collect($response->json('meses.0.itens'))->keyBy('titulo');

        $response->assertOk()
            ->assertJsonPath('kpis.batidas', 2)
            ->assertJsonPath('kpis.total_bonus', 600)
            ->assertJsonPath('meses.0.bonus_total', 600);

        $this->assertTrue($itens['Linear']['bateu']);
        $this->assertEquals(150, $itens['Linear']['percentual']);
        $this->assertEquals(300, $itens['Linear']['valor_bonus']);

        $this->assertTrue($itens['Unidade']['bateu']);
        $this->assertEquals(140, $itens['Unidade']['percentual']);
        $this->assertEquals(300, $itens['Unidade']['valor_bonus']);

        $this->assertFalse($itens['Pendente linear']['bateu']);
        $this->assertEquals(50, $itens['Pendente linear']['percentual']);
        $this->assertEquals(0, $itens['Pendente linear']['valor_bonus']);
    }

    public function test_meus_resultados_reflete_faixa_unidade_e_por_unidade(): void
    {
        $org = $this->createOrg();

        $reunioes = $this->metaIndividual($org, 0, 'Reuniões SDR');
        $reunioes->update([
            'modo_bonus' => 'faixa_unidade',
            'niveis_faixa' => BonusPagamento::tabelaSdrReunioes(),
        ]);
        $this->bater($reunioes, 32);

        $contratos = $this->metaIndividual($org, 50, 'Contratos SDR');
        $contratos->update(['modo_bonus' => 'por_unidade']);
        $this->bater($contratos, 2);

        $abaixo = $this->metaIndividual($org, 0, 'Reuniões abaixo');
        $abaixo->update([
            'modo_bonus' => 'faixa_unidade',
            'niveis_faixa' => BonusPagamento::tabelaSdrReunioes(),
        ]);
        $this->bater($abaixo, 18);

        $response = $this->actingAs($org['colaborador'])->getJson('/api/me/resultados?ano=2026');
        $itens = collect($response->json('meses.0.itens'))->keyBy('titulo');

        $response->assertOk()
            ->assertJsonPath('kpis.total_bonus', 484);

        $this->assertTrue($itens['Reuniões SDR']['bateu']);
        $this->assertEquals(384, $itens['Reuniões SDR']['valor_bonus']);
        $this->assertSame('Meta 2', $itens['Reuniões SDR']['nivel']);

        $this->assertTrue($itens['Contratos SDR']['bateu']);
        $this->assertEquals(100, $itens['Contratos SDR']['valor_bonus']);

        $this->assertFalse($itens['Reuniões abaixo']['bateu']);
        $this->assertEquals(0, $itens['Reuniões abaixo']['valor_bonus']);
    }

    public function test_colaborador_nao_ve_configuracao_de_bonus_no_detalhe(): void
    {
        $org = $this->createOrg();
        $id = $this->actingAs($org['direcao'])->postJson('/api/metas', $this->payloadQuantitativa($org, [
            'modo_bonus' => 'linear',
            'valor_bonus' => 200,
            'bonus_piso_percentual' => 100,
            'bonus_teto_percentual' => 180,
        ]))->assertCreated()->json('id');

        $this->actingAs($org['colaborador'])->getJson("/api/metas/{$id}?ano=2026&mes=9")
            ->assertOk()
            ->assertJsonMissingPath('valor_bonus')
            ->assertJsonMissingPath('modo_bonus')
            ->assertJsonMissingPath('bonus_piso_percentual')
            ->assertJsonMissingPath('bonus_teto_percentual')
            ->assertJsonMissingPath('bonus_por_unidade_extra')
            ->assertJsonMissingPath('niveis_faixa');
    }

    /**
     * @param  array<string, mixed>  $org
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payloadQuantitativa(array $org, array $overrides = []): array
    {
        return array_merge([
            'titulo' => 'Meta quantitativa',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'individual',
            'valor_meta' => 100,
            'valor_bonus' => 200,
            'unidade' => '%',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'progress_bar',
            'chart_cor' => '#00A8E8',
            'usuario_ids' => [$org['colaborador']->id],
            'modo_bonus' => 'fixo',
        ], $overrides);
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
