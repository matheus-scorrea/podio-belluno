<?php

namespace Tests\Feature;

use App\Models\Meta;
use App\Models\User;
use App\Services\ComissaoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MetaComissaoTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function payloadComissao(array $org, array $overrides = []): array
    {
        return array_merge([
            'titulo' => 'Comissão de vendedores',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'individual',
            'valor_meta' => 25000,
            'unidade' => 'R$',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'comissao',
            'chart_cor' => '#00A8E8',
            'usuario_ids' => [$org['colaborador']->id],
            'niveis_comissao' => ComissaoService::tabelaBelluno(),
        ], $overrides);
    }

    public function test_direcao_cria_meta_comissao_com_gatilhos(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])
            ->postJson('/api/metas', $this->payloadComissao($org, ['tipo_escopo' => 'global']))
            ->assertUnprocessable();

        $criada = $this->actingAs($org['direcao'])
            ->postJson('/api/metas', $this->payloadComissao($org))
            ->assertCreated();

        $this->assertSame('comissao', $criada->json('chart_tipo'));
        $this->assertSame('R$', $criada->json('unidade'));
        $this->assertCount(6, $criada->json('niveis_comissao'));
        $this->assertEquals(25000, (float) $criada->json('valor_meta'));
    }

    public function test_colaborador_lanca_propria_comissao_e_nao_a_do_colega(): void
    {
        $org = $this->createOrg();
        $colega = User::factory()->create([
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ]);

        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'chart_tipo' => 'comissao',
            'unidade' => 'R$',
            'agregacao' => 'soma',
            'niveis_comissao' => ComissaoService::tabelaBelluno(),
        ]);
        $meta->usuarios()->sync([$org['colaborador']->id, $colega->id]);
        $meta->competencias()->update(['valor_meta' => 25000]);

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 15000,
            'valor_adesao' => 7500,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['colaborador']->id,
        ])->assertCreated();

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 25000,
            'valor_adesao' => 25000,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $colega->id,
        ])->assertForbidden();

        $dash = $this->actingAs($org['colaborador'])->getJson('/api/dashboard?ano=2026&mes=9');
        $dash->assertOk();
        $item = collect($dash->json('metas'))->firstWhere('titulo', $meta->titulo);
        $this->assertNotNull($item);
        $this->assertSame('comissao', $item['chart']['tipo']);
        $this->assertCount(1, $item['comissao']['vendedores']);
        $this->assertSame('META 1', $item['comissao']['vendedores'][0]['nivel']);
        $this->assertEquals(750, $item['comissao']['vendedores'][0]['comissao']);
        $this->assertEquals(500, $item['comissao']['vendedores'][0]['premio']);
        $this->assertEquals(1250, $item['comissao']['vendedores'][0]['total']);
    }

    public function test_lider_lanca_comissao_do_setor_e_nao_de_outro(): void
    {
        $org = $this->createOrg();

        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'chart_tipo' => 'comissao',
            'unidade' => 'R$',
            'agregacao' => 'soma',
            'niveis_comissao' => ComissaoService::tabelaBelluno(),
        ]);
        $meta->usuarios()->sync([$org['colaborador']->id, $org['outroLider']->id]);
        $meta->competencias()->update(['valor_meta' => 25000]);

        $this->actingAs($org['lider'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 25000,
            'valor_adesao' => 25000,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['colaborador']->id,
        ])->assertCreated();

        $this->actingAs($org['lider'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 25000,
            'valor_adesao' => 25000,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['outroLider']->id,
        ])->assertForbidden();

        $dash = $this->actingAs($org['lider'])->getJson('/api/dashboard?ano=2026&mes=9');
        $item = collect($dash->json('metas'))->firstWhere('id', $meta->id);
        $this->assertNotNull($item);
        $nomes = collect($item['comissao']['vendedores'])->pluck('nome');
        $this->assertTrue($nomes->contains($org['colaborador']->name));
        $this->assertFalse($nomes->contains($org['outroLider']->name));
        $ana = collect($item['comissao']['vendedores'])->firstWhere('usuario_id', $org['colaborador']->id);
        $this->assertSame('META 6', $ana['nivel']);
        $this->assertEquals(3750, $ana['total']);
    }

    public function test_meta_quantitativa_continua_com_um_valor(): void
    {
        $org = $this->createOrg();
        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'chart_tipo' => 'gauge',
        ]);
        $meta->departamentos()->sync([$org['dept']->id]);

        $this->actingAs($org['lider'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 80,
            'data_evento' => '2026-09-09',
        ])->assertCreated();

        $item = collect($this->actingAs($org['lider'])->getJson('/api/dashboard?ano=2026&mes=9')->json('metas'))
            ->firstWhere('id', $meta->id);
        $this->assertArrayNotHasKey('comissao', $item);
        $this->assertEquals(80, $item['valor_realizado']);
    }
}
