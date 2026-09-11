<?php

namespace Tests\Feature;

use App\Models\Cargo;
use App\Models\Meta;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MetaRbacTest extends TestCase
{
    use RefreshDatabase;

    public function test_apenas_direcao_cria_meta(): void
    {
        $org = $this->createOrg();

        $payload = [
            'titulo' => 'Meta Global',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'global',
            'valor_meta' => 100,
            'unidade' => '%',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'gauge',
            'chart_cor' => '#00A8E8',
        ];

        $this->actingAs($org['lider'])->postJson('/api/metas', $payload)->assertForbidden();
        $this->actingAs($org['direcao'])->postJson('/api/metas', $payload)->assertCreated();
    }

    public function test_bonus_fica_no_cadastro_e_nao_no_dashboard(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'Meta com bônus',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'global',
            'valor_meta' => 100,
            'valor_bonus' => 350.5,
            'unidade' => '%',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'gauge',
            'chart_cor' => '#00A8E8',
        ])->assertCreated()->assertJsonPath('valor_bonus', '350.50');

        $this->assertDatabaseHas('metas', [
            'titulo' => 'Meta com bônus',
            'valor_bonus' => 350.5,
        ]);

        $item = collect($this->actingAs($org['direcao'])->getJson('/api/dashboard?ano=2026&mes=9')->json('metas'))
            ->firstWhere('titulo', 'Meta com bônus');
        $this->assertIsArray($item);
        $this->assertArrayNotHasKey('valor_bonus', $item);
    }

    public function test_bonus_nao_vaza_na_listagem_nem_no_detalhe_fora_da_direcao(): void
    {
        $org = $this->createOrg();

        $criada = $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'Meta com bônus oculto',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'global',
            'valor_meta' => 100,
            'valor_bonus' => 350.5,
            'unidade' => '%',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'gauge',
            'chart_cor' => '#00A8E8',
        ])->assertCreated();

        $id = $criada->json('id');

        $listaLider = collect($this->actingAs($org['lider'])->getJson('/api/metas?ano=2026&mes=9')->json())
            ->firstWhere('id', $id);
        $this->assertIsArray($listaLider);
        $this->assertArrayNotHasKey('valor_bonus', $listaLider);

        $this->actingAs($org['lider'])->getJson("/api/metas/{$id}?ano=2026&mes=9")
            ->assertOk()
            ->assertJsonMissingPath('valor_bonus');

        $this->actingAs($org['direcao'])->getJson("/api/metas/{$id}?ano=2026&mes=9")
            ->assertOk()
            ->assertJsonPath('valor_bonus', '350.50');

        $listaDirecao = collect($this->actingAs($org['direcao'])->getJson('/api/metas?ano=2026&mes=9')->json())
            ->firstWhere('id', $id);
        $this->assertIsArray($listaDirecao);
        $this->assertArrayHasKey('valor_bonus', $listaDirecao);
    }

    public function test_senha_nova_exige_confirmacao_e_complexidade(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/usuarios', [
            'name' => 'Nova Pessoa',
            'email' => 'nova@bellunotec.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'is_direcao' => false,
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ])->assertUnprocessable();

        $this->actingAs($org['direcao'])->postJson('/api/usuarios', [
            'name' => 'Nova Pessoa',
            'email' => 'nova@bellunotec.com',
            'password' => 'SenhaForte1',
            'is_direcao' => false,
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ])->assertUnprocessable();

        $this->actingAs($org['direcao'])->postJson('/api/usuarios', [
            'name' => 'Nova Pessoa',
            'email' => 'nova@bellunotec.com',
            'password' => 'SenhaForte1',
            'password_confirmation' => 'SenhaForte1',
            'is_direcao' => false,
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ])->assertCreated();
    }

    public function test_colaborador_so_ve_metas_em_que_se_enquadra(): void
    {
        $org = $this->createOrg();

        $propria = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => 'Meta da Ana',
        ]);
        $propria->usuarios()->sync([$org['colaborador']->id]);

        $outra = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'titulo' => 'Meta do RH',
        ]);
        $outra->departamentos()->sync([$org['outro']->id]);

        $response = $this->actingAs($org['colaborador'])->getJson('/api/dashboard?ano=2026&mes=9');

        $response->assertOk();
        $titulos = collect($response->json('metas'))->pluck('titulo');
        $this->assertTrue($titulos->contains('Meta da Ana'));
        $this->assertFalse($titulos->contains('Meta do RH'));
    }

    public function test_lider_nao_ve_nem_lanca_meta_de_outro_setor(): void
    {
        $org = $this->createOrg();

        $metaRh = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'chart_tipo' => 'gauge',
            'titulo' => 'Meta RH',
        ]);
        $metaRh->departamentos()->sync([$org['outro']->id]);

        $dash = $this->actingAs($org['lider'])->getJson('/api/dashboard?ano=2026&mes=9');
        $dash->assertOk();
        $this->assertFalse(collect($dash->json('metas'))->pluck('titulo')->contains('Meta RH'));
        $this->assertFalse(collect($dash->json('grupos'))->pluck('id')->contains($org['outro']->id));

        $this->actingAs($org['lider'])->getJson("/api/metas/{$metaRh->id}?ano=2026&mes=9")->assertForbidden();
        $this->actingAs($org['lider'])->getJson('/api/metas?ano=2026&mes=9')
            ->assertOk()
            ->assertJsonMissing(['titulo' => 'Meta RH']);

        $this->actingAs($org['lider'])->postJson("/api/metas/{$metaRh->id}/lancamentos", [
            'valor_realizado' => 50,
            'data_evento' => '2026-09-09',
        ])->assertForbidden();
    }

    public function test_lider_ve_todas_as_metas_do_proprio_setor(): void
    {
        $org = $this->createOrg();

        $global = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'global',
            'titulo' => 'Meta Empresa',
        ]);
        $this->assertNotNull($global);

        $setor = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'titulo' => 'Meta TI',
        ]);
        $setor->departamentos()->sync([$org['dept']->id]);

        $pessoa = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => 'Meta da Ana',
        ]);
        $pessoa->usuarios()->sync([$org['colaborador']->id]);

        $outra = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'titulo' => 'Meta RH',
        ]);
        $outra->departamentos()->sync([$org['outro']->id]);

        $dash = $this->actingAs($org['lider'])->getJson('/api/dashboard?ano=2026&mes=9');
        $dash->assertOk();
        $this->assertSame('setor', $dash->json('visao'));

        $titulos = collect($dash->json('metas'))->pluck('titulo');
        $this->assertTrue($titulos->contains('Meta Empresa'));
        $this->assertTrue($titulos->contains('Meta TI'));
        $this->assertTrue($titulos->contains('Meta da Ana'));
        $this->assertFalse($titulos->contains('Meta RH'));
    }

    public function test_lider_lanca_apenas_seu_setor_em_meta_global_comparativa(): void
    {
        $org = $this->createOrg();

        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'global',
            'chart_tipo' => 'column',
            'titulo' => 'Treinamento',
        ]);

        $dash = $this->actingAs($org['lider'])->getJson('/api/dashboard?ano=2026&mes=9');
        $item = collect($dash->json('metas'))->firstWhere('titulo', 'Treinamento');
        $this->assertNotNull($item);
        $this->assertSame([$org['dept']->id], collect($item['series'])->pluck('departamento_id')->all());

        $this->actingAs($org['lider'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 75,
            'data_evento' => '2026-09-09',
            'departamento_id' => $org['outro']->id,
        ])->assertCreated();

        $this->assertDatabaseHas('meta_lancamentos', [
            'meta_id' => $meta->id,
            'departamento_id' => $org['dept']->id,
            'valor_realizado' => 75,
        ]);
        $this->assertDatabaseMissing('meta_lancamentos', [
            'meta_id' => $meta->id,
            'departamento_id' => $org['outro']->id,
        ]);
    }

    public function test_colaborador_nao_lanca_meta_do_setor(): void
    {
        $org = $this->createOrg();
        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'chart_tipo' => 'gauge',
        ]);
        $meta->departamentos()->sync([$org['dept']->id]);

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 10,
            'data_evento' => '2026-09-09',
        ])->assertForbidden();
    }

    public function test_colaborador_lanca_apenas_a_propria_meta(): void
    {
        $org = $this->createOrg();
        $colega = User::factory()->create([
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ]);

        $propria = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => 'Meta da Ana',
        ]);
        $propria->usuarios()->sync([$org['colaborador']->id]);

        $doColega = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => 'Meta do colega',
        ]);
        $doColega->usuarios()->sync([$colega->id]);

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$propria->id}/lancamentos", [
            'valor_realizado' => 40,
            'data_evento' => '2026-09-09',
        ])->assertCreated();

        $this->actingAs($org['colaborador'])->postJson("/api/metas/{$doColega->id}/lancamentos", [
            'valor_realizado' => 40,
            'data_evento' => '2026-09-09',
        ])->assertForbidden();

        $lancaveis = collect($this->actingAs($org['colaborador'])->getJson('/api/metas/lancaveis?ano=2026&mes=9')->json('data'))->pluck('titulo');
        $this->assertTrue($lancaveis->contains('Meta da Ana'));
        $this->assertFalse($lancaveis->contains('Meta do colega'));

        $dash = collect($this->actingAs($org['colaborador'])->getJson('/api/dashboard?ano=2026&mes=9')->json('metas'));
        $this->assertFalse($dash->firstWhere('titulo', 'Meta da Ana')['somente_leitura']);
        $this->assertTrue($dash->firstWhere('titulo', 'Meta da Ana')['pode_lancar']);
    }

    public function test_lider_lanca_meta_individual_do_proprio_setor(): void
    {
        $org = $this->createOrg();
        $meta = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => 'Meta da Ana',
        ]);
        $meta->usuarios()->sync([$org['colaborador']->id]);

        $this->actingAs($org['lider'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 55,
            'data_evento' => '2026-09-09',
        ])->assertCreated();
    }

    public function test_colaborador_nao_acessa_cadastros(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['colaborador'])->postJson('/api/departamentos', [
            'nome' => 'Novo',
        ])->assertForbidden();
    }

    public function test_meta_unica_aparece_em_varias_competencias(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'Saldo Crescimento',
            'ano' => 2026,
            'mes' => 8,
            'tipo_escopo' => 'global',
            'valor_meta' => 15000,
            'unidade' => 'R$',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'progress_bar',
            'chart_cor' => '#00A8E8',
        ])->assertCreated();

        $meta = Meta::query()->where('titulo', 'Saldo Crescimento')->firstOrFail();
        $this->actingAs($org['direcao'])->putJson("/api/metas/{$meta->id}", [
            'titulo' => 'Saldo Crescimento',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'global',
            'valor_meta' => 15000,
            'unidade' => 'R$',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'progress_bar',
            'chart_cor' => '#00A8E8',
        ])->assertOk();

        $this->assertSame(1, Meta::query()->count());
        $this->assertDatabaseCount('meta_competencias', 2);

        $setembro = $this->actingAs($org['direcao'])->getJson('/api/dashboard?ano=2026&mes=9');
        $agosto = $this->actingAs($org['direcao'])->getJson('/api/dashboard?ano=2026&mes=8');
        $setembro->assertOk();
        $agosto->assertOk();
        $idSetembro = collect($setembro->json('metas'))->firstWhere('titulo', 'Saldo Crescimento')['id'];
        $idAgosto = collect($agosto->json('metas'))->firstWhere('titulo', 'Saldo Crescimento')['id'];
        $this->assertSame($meta->id, $idSetembro);
        $this->assertSame($idSetembro, $idAgosto);
    }

    public function test_direcao_replica_alvos_do_mes_anterior(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'NPS',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'global',
            'valor_meta' => 80,
            'unidade' => '%',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'gauge',
            'chart_cor' => '#00A8E8',
        ])->assertCreated();

        $this->actingAs($org['direcao'])->postJson('/api/metas/abrir-competencia', [
            'ano' => 2026,
            'mes' => 10,
        ])->assertOk()->assertJson(['criadas' => 1]);

        $this->assertDatabaseHas('meta_competencias', [
            'ano' => 2026,
            'mes' => 10,
        ]);
        $this->assertSame(1, Meta::query()->count());
    }

    public function test_meta_por_marco_e_disparada_como_feito(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'Implantar IAnalista',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'departamento',
            'valor_meta' => 100,
            'unidade' => '%',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'marco',
            'chart_cor' => '#00A8E8',
            'departamento_ids' => [$org['dept']->id],
        ])->assertCreated()
            ->assertJsonPath('chart_tipo', 'marco')
            ->assertJsonPath('unidade', 'marco');

        $meta = Meta::query()->where('titulo', 'Implantar IAnalista')->firstOrFail();
        $this->actingAs($org['lider'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 1,
            'data_evento' => '2026-09-09',
        ])->assertCreated();

        $dash = $this->actingAs($org['direcao'])->getJson('/api/dashboard?ano=2026&mes=9');
        $dash->assertOk();
        $item = collect($dash->json('metas'))->firstWhere('titulo', 'Implantar IAnalista');
        $this->assertNotNull($item);
        $this->assertSame('marco', $item['chart']['tipo']);
        $this->assertSame('concluida', $item['status']);
        $this->assertSame(100, (int) $item['percentual']);

        $this->actingAs($org['direcao'])->postJson('/api/metas/abrir-competencia', [
            'ano' => 2026,
            'mes' => 10,
        ])->assertOk()->assertJson(['criadas' => 1]);

        $outubro = collect($this->actingAs($org['direcao'])->getJson('/api/dashboard?ano=2026&mes=10')->json('metas'))
            ->firstWhere('titulo', 'Implantar IAnalista');
        $this->assertSame('concluida', $outubro['status']);
    }

    public function test_converte_entregas_do_banco_para_marco(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->postJson('/api/metas', [
            'titulo' => 'Show na confra',
            'ano' => 2026,
            'mes' => 9,
            'tipo_escopo' => 'global',
            'valor_meta' => 100,
            'unidade' => '%',
            'sentido' => 'maior_melhor',
            'chart_tipo' => 'gauge',
            'chart_cor' => '#00A8E8',
        ])->assertCreated();

        $meta = Meta::query()->where('titulo', 'Show na confra')->firstOrFail();
        $this->actingAs($org['direcao'])->postJson("/api/metas/{$meta->id}/lancamentos", [
            'valor_realizado' => 100,
            'data_evento' => '2026-09-09',
        ])->assertCreated();

        $this->actingAs($org['direcao'])->postJson('/api/metas/abrir-competencia', [
            'ano' => 2026,
            'mes' => 10,
        ])->assertOk();

        $this->assertSame(1, \App\Support\MetasMarco::converterCatalogo());

        $meta->refresh();
        $this->assertTrue($meta->isMarco());
        $this->assertSame('marco', $meta->unidade);
        $this->assertSame('ultimo', $meta->agregacao);

        $setembro = $meta->competencias()->where('ano', 2026)->where('mes', 9)->firstOrFail();
        $outubro = $meta->competencias()->where('ano', 2026)->where('mes', 10)->firstOrFail();
        $this->assertSame(1.0, (float) $setembro->valor_meta);
        $this->assertSame(1.0, (float) $setembro->valor_realizado);
        $this->assertSame(1.0, (float) $outubro->valor_realizado);
        $this->assertSame(1.0, (float) $meta->lancamentos()->firstOrFail()->valor_realizado);
    }

    public function test_direcao_edita_departamento_cargo_e_usuario(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])->putJson("/api/departamentos/{$org['dept']->id}", [
            'nome' => 'TI e DEV',
            'ativo' => true,
            'cargos' => [
                ['id' => $org['liderCargo']->id, 'nome' => 'Líder de Tecnologia', 'ativo' => true, 'lider' => true],
                ['id' => $org['comumCargo']->id, 'nome' => 'Analista de TI', 'ativo' => true, 'lider' => false],
            ],
        ])->assertOk()
            ->assertJsonPath('nome', 'TI e DEV')
            ->assertJsonPath('cargo_lider.nome', 'Líder de Tecnologia');

        $this->actingAs($org['direcao'])->putJson("/api/usuarios/{$org['colaborador']->id}", [
            'name' => 'Ana Editada',
            'email' => $org['colaborador']->email,
            'is_direcao' => false,
            'ativo' => true,
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ])->assertOk()->assertJsonPath('data.name', 'Ana Editada');
    }

    public function test_departamento_cadastra_cargos_juntos_e_permite_inativar(): void
    {
        $org = $this->createOrg();

        $criado = $this->actingAs($org['direcao'])->postJson('/api/departamentos', [
            'nome' => 'Financeiro',
            'ativo' => true,
            'cargos' => [
                ['nome' => 'Líder Financeiro', 'ativo' => true, 'lider' => true],
                ['nome' => 'Analista Financeiro', 'ativo' => true, 'lider' => false],
            ],
        ])->assertCreated();

        $this->assertSame('Financeiro', $criado->json('nome'));
        $this->assertSame('Líder Financeiro', $criado->json('cargo_lider.nome'));
        $this->assertCount(2, $criado->json('cargos'));

        $id = $criado->json('id');
        $cargos = collect($criado->json('cargos'));
        $lider = $cargos->firstWhere('nome', 'Líder Financeiro');
        $analista = $cargos->firstWhere('nome', 'Analista Financeiro');

        $this->actingAs($org['direcao'])->putJson("/api/departamentos/{$id}", [
            'nome' => 'Financeiro',
            'ativo' => false,
            'cargos' => [
                ['id' => $lider['id'], 'nome' => 'Líder Financeiro', 'ativo' => false, 'lider' => false],
                ['id' => $analista['id'], 'nome' => 'Analista Financeiro', 'ativo' => true, 'lider' => true],
            ],
        ])->assertOk()
            ->assertJsonPath('ativo', false)
            ->assertJsonPath('cargo_lider.nome', 'Analista Financeiro');

        $this->actingAs($org['direcao'])->putJson("/api/departamentos/{$id}", [
            'nome' => 'Financeiro',
            'ativo' => false,
            'cargos' => [
                ['id' => $lider['id'], 'nome' => 'Líder Financeiro', 'ativo' => false, 'lider' => true],
                ['id' => $analista['id'], 'nome' => 'Analista Financeiro', 'ativo' => true, 'lider' => false],
            ],
        ])->assertUnprocessable();
    }

    public function test_direcao_remove_cargo_sem_vinculo(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])
            ->deleteJson("/api/cargos/{$org['comumCargo']->id}")
            ->assertUnprocessable();

        $extra = Cargo::factory()->create([
            'nome' => 'Estagiário de TI',
            'departamento_id' => $org['dept']->id,
        ]);

        $this->actingAs($org['direcao'])
            ->deleteJson("/api/cargos/{$extra->id}")
            ->assertNoContent();
        $this->assertDatabaseMissing('cargos', ['id' => $extra->id]);
    }

    public function test_direcao_inativa_e_exclui_usuario(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['direcao'])
            ->putJson("/api/usuarios/{$org['colaborador']->id}", ['ativo' => false])
            ->assertOk()
            ->assertJsonPath('data.ativo', false);

        $this->actingAs($org['direcao'])
            ->putJson("/api/usuarios/{$org['direcao']->id}", ['ativo' => false])
            ->assertUnprocessable();

        $this->actingAs($org['direcao'])
            ->deleteJson("/api/usuarios/{$org['direcao']->id}")
            ->assertUnprocessable();

        $this->actingAs($org['direcao'])
            ->deleteJson("/api/usuarios/{$org['colaborador']->id}")
            ->assertNoContent();
        $this->assertDatabaseMissing('users', ['id' => $org['colaborador']->id]);

        Meta::factory()->create([
            'created_by' => $org['lider']->id,
            'tipo_escopo' => 'global',
        ]);
        $this->actingAs($org['direcao'])
            ->deleteJson("/api/usuarios/{$org['lider']->id}")
            ->assertUnprocessable();
        $this->assertDatabaseHas('users', ['id' => $org['lider']->id]);
    }

    public function test_dashboard_agrupa_metas_por_departamento_e_usuario(): void
    {
        $org = $this->createOrg();

        $global = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'global',
            'titulo' => 'Meta Empresa',
        ]);
        $this->assertNotNull($global);

        $setor = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'titulo' => 'Meta TI',
        ]);
        $setor->departamentos()->sync([$org['dept']->id]);

        $pessoa = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => 'Meta Ana',
        ]);
        $pessoa->usuarios()->sync([$org['colaborador']->id]);

        $dash = $this->actingAs($org['direcao'])->getJson('/api/dashboard?ano=2026&mes=9');
        $dash->assertOk();

        $grupos = collect($dash->json('grupos'));
        $this->assertSame('global', $grupos->first()['tipo']);
        $empresa = $grupos->firstWhere('tipo', 'global');
        $this->assertNotNull($empresa);
        $this->assertTrue(collect($empresa['metas_setor'])->pluck('titulo')->contains('Meta Empresa'));

        $ti = $grupos->firstWhere('id', $org['dept']->id);
        $this->assertNotNull($ti);
        $this->assertTrue(collect($ti['metas_setor'])->pluck('titulo')->contains('Meta TI'));

        $ana = collect($ti['pessoas'])->firstWhere('id', $org['colaborador']->id);
        $this->assertNotNull($ana);
        $this->assertTrue(collect($ana['metas'])->pluck('titulo')->contains('Meta Ana'));
        $this->assertFalse(collect($ti['metas_setor'])->pluck('titulo')->contains('Meta Ana'));
    }

    public function test_desempenho_do_recorte_e_metas_batidas_sobre_o_total(): void
    {
        $org = $this->createOrg();

        foreach ([150, 150, 50] as $realizado) {
            $meta = Meta::factory()->create([
                'created_by' => $org['direcao']->id,
                'tipo_escopo' => 'global',
            ]);
            $meta->competencias()->update([
                'valor_meta' => 100,
                'valor_realizado' => $realizado,
            ]);
        }

        $this->actingAs($org['direcao'])
            ->getJson('/api/dashboard?ano=2026&mes=9')
            ->assertOk()
            ->assertJsonPath('kpis.total_ativas', 3)
            ->assertJsonPath('kpis.concluidas', 2)
            ->assertJsonPath('kpis.desempenho_medio', 66.7);
    }

    public function test_listagem_filtra_metas_por_setor_e_tipo(): void
    {
        $org = $this->createOrg();

        Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'global',
            'titulo' => 'Meta Empresa',
        ]);

        $setor = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'titulo' => 'Meta TI',
        ]);
        $setor->departamentos()->sync([$org['dept']->id]);

        $outra = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'titulo' => 'Meta RH',
        ]);
        $outra->departamentos()->sync([$org['outro']->id]);

        $this->actingAs($org['direcao'])
            ->getJson('/api/metas?ano=2026&mes=9&tipo_escopo=departamento')
            ->assertOk()
            ->assertJsonFragment(['titulo' => 'Meta TI'])
            ->assertJsonFragment(['titulo' => 'Meta RH'])
            ->assertJsonMissing(['titulo' => 'Meta Empresa']);

        $titulos = collect($this->actingAs($org['direcao'])
            ->getJson('/api/metas?ano=2026&mes=9&departamento_id='.$org['dept']->id)
            ->json())->pluck('titulo');

        $this->assertTrue($titulos->contains('Meta TI'));
        $this->assertFalse($titulos->contains('Meta RH'));
        $this->assertFalse($titulos->contains('Meta Empresa'));
    }

    public function test_listagem_ordena_metas_pela_criacao_descendente(): void
    {
        $org = $this->createOrg();

        $antiga = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'global',
            'titulo' => 'Meta antiga',
        ]);
        $nova = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'global',
            'titulo' => 'Meta nova',
        ]);
        $antiga->newQuery()->whereKey($antiga->id)->update(['created_at' => now()->subDay()]);

        $ids = collect($this->actingAs($org['direcao'])
            ->getJson('/api/metas?ano=2026&mes=9')
            ->json());

        $this->assertSame([$nova->id, $antiga->id], $ids->pluck('id')->all());
        $this->assertArrayNotHasKey('ordem_exibicao', $ids->first());
    }
}
