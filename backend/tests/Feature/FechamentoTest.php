<?php

namespace Tests\Feature;

use App\Models\Meta;
use App\Models\User;
use App\Services\ComissaoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FechamentoTest extends TestCase
{
    use RefreshDatabase;

    public function test_qualquer_perfil_autenticado_ve_fechamento(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['colaborador'])->getJson('/api/fechamento?ano=2026&mes=9')->assertOk();
        $this->actingAs($org['lider'])->getJson('/api/fechamento?ano=2026&mes=9')->assertOk();
        $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')->assertOk();
    }

    public function test_colaborador_ve_so_as_proprias_metas(): void
    {
        $org = $this->createOrg();
        $colega = User::factory()->create([
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ]);

        $metaAna = $this->metaIndividual($org, 100, 'Meta da Ana');
        $this->bater($metaAna);

        $metaColega = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => 'Meta do colega',
            'valor_bonus' => 80,
        ]);
        $metaColega->usuarios()->sync([$colega->id]);
        $this->bater($metaColega);

        $response = $this->actingAs($org['colaborador'])->getJson('/api/fechamento?ano=2026&mes=9');

        $response->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('metas_batidas', 1)
            ->assertJsonPath('total_bonus', 100)
            ->assertJsonPath('usuarios.0.id', $org['colaborador']->id)
            ->assertJsonCount(1, 'usuarios.0.itens')
            ->assertJsonPath('usuarios.0.itens.0.titulo', 'Meta da Ana');
    }

    public function test_lider_ve_o_setor_e_nao_o_outro_departamento(): void
    {
        $org = $this->createOrg();
        $metaTi = $this->metaIndividual($org, 100, 'Meta TI');
        $this->bater($metaTi);

        $metaRh = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => 'Meta RH',
            'valor_bonus' => 70,
        ]);
        $metaRh->usuarios()->sync([$org['outroLider']->id]);
        $this->bater($metaRh);

        $response = $this->actingAs($org['lider'])->getJson('/api/fechamento?ano=2026&mes=9');

        $ids = collect($response->json('usuarios'))->pluck('id');

        $response->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('metas_batidas', 1)
            ->assertJsonPath('total_bonus', 100);
        $this->assertTrue($ids->contains($org['colaborador']->id));
        $this->assertFalse($ids->contains($org['outroLider']->id));
    }

    public function test_lider_inclui_bonus_global_das_pessoas_do_setor(): void
    {
        $org = $this->createOrg();
        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'global',
            'titulo' => 'Meta empresa',
            'valor_bonus' => 40,
        ]);
        $this->bater($meta);

        $response = $this->actingAs($org['lider'])->getJson('/api/fechamento?ano=2026&mes=9');
        $ids = collect($response->json('usuarios'))->pluck('id');

        $response->assertOk();
        $this->assertTrue($ids->contains($org['colaborador']->id));
        $this->assertTrue($ids->contains($org['lider']->id));
        $this->assertFalse($ids->contains($org['outroLider']->id));
        $this->assertFalse($ids->contains($org['direcao']->id));
        $this->assertEquals(2, $response->json('pessoas'));
        $this->assertEquals(80, $response->json('total_bonus'));
    }

    public function test_colaborador_ignora_filtro_de_setor_na_query(): void
    {
        $org = $this->createOrg();
        $meta = $this->metaIndividual($org, 100);
        $this->bater($meta);

        $this->actingAs($org['colaborador'])
            ->getJson('/api/fechamento?ano=2026&mes=9&departamento_id='.$org['outro']->id)
            ->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('usuarios.0.id', $org['colaborador']->id);
    }

    public function test_lista_usuario_com_bonus_de_meta_individual_batida(): void
    {
        $org = $this->createOrg();
        $meta = $this->metaIndividual($org, 350.5);
        $this->bater($meta);

        $response = $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9');

        $response->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('metas_batidas', 1)
            ->assertJsonPath('total_bonus', 350.5)
            ->assertJsonPath('usuarios.0.id', $org['colaborador']->id)
            ->assertJsonPath('usuarios.0.bonus_total', 350.5)
            ->assertJsonPath('usuarios.0.itens.0.titulo', 'Meta da Ana')
            ->assertJsonPath('usuarios.0.itens.0.valor_bonus', 350.5);
    }

    public function test_nao_lista_usuario_quando_meta_nao_foi_batida(): void
    {
        $org = $this->createOrg();
        $this->metaIndividual($org, 200);

        $response = $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9');

        $response->assertOk()
            ->assertJsonPath('pessoas', 0)
            ->assertJsonPath('total_bonus', 0)
            ->assertJsonPath('usuarios', []);
    }

    public function test_lista_usuario_mesmo_quando_bonus_da_meta_e_zero(): void
    {
        $org = $this->createOrg();
        $meta = $this->metaIndividual($org, 0);
        $this->bater($meta);

        $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')
            ->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('metas_batidas', 1)
            ->assertJsonPath('total_bonus', 0)
            ->assertJsonPath('usuarios.0.id', $org['colaborador']->id)
            ->assertJsonPath('usuarios.0.bonus_total', 0);
    }

    public function test_soma_bonus_de_varias_metas_do_mesmo_usuario(): void
    {
        $org = $this->createOrg();
        $primeira = $this->metaIndividual($org, 100, 'Primeira');
        $segunda = $this->metaIndividual($org, 50, 'Segunda');
        $this->bater($primeira);
        $this->bater($segunda);

        $response = $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9');

        $response->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('total_bonus', 150)
            ->assertJsonPath('usuarios.0.bonus_total', 150)
            ->assertJsonCount(2, 'usuarios.0.itens');
    }

    public function test_meta_de_setor_paga_as_pessoas_do_setor(): void
    {
        $org = $this->createOrg();
        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'titulo' => 'Meta TI',
            'valor_bonus' => 80,
        ]);
        $meta->departamentos()->sync([$org['dept']->id]);
        $this->bater($meta);

        $ids = collect($this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')->json('usuarios'))
            ->pluck('id');

        $this->assertTrue($ids->contains($org['colaborador']->id));
        $this->assertTrue($ids->contains($org['lider']->id));
        $this->assertFalse($ids->contains($org['outroLider']->id));
        $this->assertFalse($ids->contains($org['direcao']->id));
    }

    public function test_meta_global_nao_paga_direcao(): void
    {
        $org = $this->createOrg();
        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'global',
            'titulo' => 'Meta empresa',
            'valor_bonus' => 40,
        ]);
        $this->bater($meta);

        $ids = collect($this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')->json('usuarios'))
            ->pluck('id');

        $this->assertTrue($ids->contains($org['colaborador']->id));
        $this->assertFalse($ids->contains($org['direcao']->id));
    }

    public function test_usuario_inativo_nao_entra_no_fechamento(): void
    {
        $org = $this->createOrg();
        $org['colaborador']->update(['ativo' => false]);
        $meta = $this->metaIndividual($org, 200);
        $this->bater($meta);

        $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')
            ->assertOk()
            ->assertJsonPath('pessoas', 0);
    }

    public function test_meta_comparativa_individual_paga_so_quem_bateu(): void
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
            'titulo' => 'Comparativa',
            'valor_bonus' => 90,
        ]);
        $meta->usuarios()->sync([$org['colaborador']->id, $colega->id]);

        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 100,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['colaborador']->id,
            'departamento_id' => $org['colaborador']->departamento_id,
        ])->assertCreated();

        $ids = collect($this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')->json('usuarios'))
            ->pluck('id');

        $this->assertTrue($ids->contains($org['colaborador']->id));
        $this->assertFalse($ids->contains($colega->id));
    }

    public function test_filtro_por_setor(): void
    {
        $org = $this->createOrg();
        $metaTi = $this->metaIndividual($org, 100, 'Meta TI');
        $this->bater($metaTi);

        $metaRh = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => 'Meta RH',
            'valor_bonus' => 70,
        ]);
        $metaRh->usuarios()->sync([$org['outroLider']->id]);
        $this->bater($metaRh);

        $ti = $this->actingAs($org['direcao'])
            ->getJson('/api/fechamento?ano=2026&mes=9&departamento_id='.$org['dept']->id)
            ->json('usuarios');

        $this->assertCount(1, $ti);
        $this->assertSame($org['colaborador']->id, $ti[0]['id']);
    }

    public function test_comissao_paga_faixa_atingida_nao_o_bonus_fixo_do_cadastro(): void
    {
        $org = $this->createOrg();
        $meta = $this->metaComissao($org);

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 15000,
            'valor_adesao' => 7500,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['colaborador']->id,
        ])->assertCreated();

        $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')
            ->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('metas_batidas', 1)
            ->assertJsonPath('total_bonus', 1250)
            ->assertJsonPath('usuarios.0.id', $org['colaborador']->id)
            ->assertJsonPath('usuarios.0.itens.0.valor_bonus', 1250)
            ->assertJsonPath('usuarios.0.itens.0.nivel', 'META 1');
    }

    public function test_comissao_acompanha_aumento_dos_gatilhos_no_mesmo_mes(): void
    {
        $org = $this->createOrg();
        $meta = $this->metaComissao($org);

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 15000,
            'valor_adesao' => 7500,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['colaborador']->id,
        ])->assertCreated();

        $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')
            ->assertJsonPath('total_bonus', 1250);

        $niveis = ComissaoService::tabelaBelluno();
        $niveis[0]['premio'] = 2000;

        $this->actingAs($org['direcao'])->putJson("/api/metas/{$meta->id}", $this->payloadComissao($org, $meta, [
            'niveis_comissao' => $niveis,
        ]))->assertOk();

        $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')
            ->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('total_bonus', 2750)
            ->assertJsonPath('usuarios.0.itens.0.valor_bonus', 2750);
    }

    public function test_comissao_so_paga_quem_atingiu_faixa(): void
    {
        $org = $this->createOrg();
        $colega = User::factory()->create([
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ]);
        $meta = $this->metaComissao($org, [$org['colaborador']->id, $colega->id]);

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 15000,
            'valor_adesao' => 7500,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['colaborador']->id,
        ])->assertCreated();

        $ids = collect($this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')->json('usuarios'))
            ->pluck('id');

        $this->assertTrue($ids->contains($org['colaborador']->id));
        $this->assertFalse($ids->contains($colega->id));
    }

    public function test_marco_compartilhado_paga_todo_o_escopo(): void
    {
        $org = $this->createOrg();
        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'chart_tipo' => 'marco',
            'unidade' => 'marco',
            'agregacao' => 'ultimo',
            'titulo' => 'Marco do setor',
            'valor_bonus' => 40,
            'marco_por_pessoa' => false,
        ]);
        $meta->departamentos()->sync([$org['dept']->id]);
        $meta->competencias()->update(['valor_meta' => 1]);
        $this->bater($meta, 1);

        $ids = collect($this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9')->json('usuarios'))
            ->pluck('id');

        $this->assertTrue($ids->contains($org['colaborador']->id));
        $this->assertTrue($ids->contains($org['lider']->id));
        $this->assertFalse($ids->contains($org['outroLider']->id));
    }

    public function test_marco_por_pessoa_paga_so_quem_concluiu(): void
    {
        $org = $this->createOrg();
        $colega = User::factory()->create([
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ]);

        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'Marco individual',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'individual',
            'valor_meta' => 1,
            'valor_bonus' => 90,
            'unidade' => 'marco',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'marco',
            'chart_cor' => '#00A8E8',
            'usuario_ids' => [$org['colaborador']->id, $colega->id],
            'marco_por_pessoa' => true,
        ])->assertCreated();

        $meta = Meta::query()->where('titulo', 'Marco individual')->firstOrFail();

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 1,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['colaborador']->id,
        ])->assertCreated();

        $response = $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9');
        $ids = collect($response->json('usuarios'))->pluck('id');

        $response->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('metas_batidas', 1)
            ->assertJsonPath('total_bonus', 90);
        $this->assertTrue($ids->contains($org['colaborador']->id));
        $this->assertFalse($ids->contains($colega->id));
    }

    public function test_quantitativa_por_pessoa_paga_so_quem_bateu(): void
    {
        $org = $this->createOrg();
        $colega = User::factory()->create([
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ]);

        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'Atendimentos individuais',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'individual',
            'valor_meta' => 100,
            'valor_bonus' => 90,
            'unidade' => 'un',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'gauge',
            'chart_cor' => '#00A8E8',
            'usuario_ids' => [$org['colaborador']->id, $colega->id],
            'marco_por_pessoa' => true,
        ])->assertCreated();

        $meta = Meta::query()->where('titulo', 'Atendimentos individuais')->firstOrFail();

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 100,
            'data_evento' => '2026-09-09',
            'usuario_alvo_id' => $org['colaborador']->id,
        ])->assertCreated();

        $response = $this->actingAs($org['direcao'])->getJson('/api/fechamento?ano=2026&mes=9');
        $ids = collect($response->json('usuarios'))->pluck('id');

        $response->assertOk()
            ->assertJsonPath('pessoas', 1)
            ->assertJsonPath('metas_batidas', 1)
            ->assertJsonPath('total_bonus', 90);
        $this->assertTrue($ids->contains($org['colaborador']->id));
        $this->assertFalse($ids->contains($colega->id));
    }

    /**
     * @param  array<string, mixed>  $org
     * @param  list<int>|null  $usuarioIds
     */
    private function metaComissao(array $org, ?array $usuarioIds = null): Meta
    {
        $ids = $usuarioIds ?? [$org['colaborador']->id];
        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'chart_tipo' => 'comissao',
            'unidade' => 'R$',
            'agregacao' => 'soma',
            'valor_bonus' => 0,
            'niveis_comissao' => ComissaoService::tabelaBelluno(),
        ]);
        $meta->usuarios()->sync($ids);
        $meta->competencias()->update([
            'valor_meta' => 25000,
            'niveis_comissao' => ComissaoService::tabelaBelluno(),
        ]);

        return $meta;
    }

    /**
     * @param  array<string, mixed>  $org
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payloadComissao(array $org, Meta $meta, array $overrides = []): array
    {
        return array_merge([
            'titulo' => $meta->titulo,
            'descricao' => $meta->descricao,
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'individual',
            'valor_meta' => 25000,
            'valor_bonus' => 0,
            'unidade' => 'R$',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'comissao',
            'chart_cor' => $meta->chart_cor,
            'usuario_ids' => $meta->usuarios()->pluck('users.id')->all() ?: [$org['colaborador']->id],
            'niveis_comissao' => ComissaoService::tabelaBelluno(),
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
