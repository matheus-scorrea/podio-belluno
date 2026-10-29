<?php

namespace Tests\Feature;

use App\Models\Meta;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MetaEscopoUsuariosTest extends TestCase
{
    use RefreshDatabase;

    public function test_listagem_traz_usuarios_englobados_por_escopo(): void
    {
        $org = $this->createOrg();
        User::factory()->create([
            'name' => 'Inativo TI',
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
            'ativo' => false,
        ]);

        $individual = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'individual',
            'titulo' => 'Meta Individual',
        ]);
        $individual->usuarios()->sync([$org['colaborador']->id]);

        $cargo = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'cargo',
            'titulo' => 'Meta Cargo',
        ]);
        $cargo->cargos()->sync([$org['comumCargo']->id]);

        $setor = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'departamento',
            'titulo' => 'Meta Setor',
        ]);
        $setor->departamentos()->sync([$org['dept']->id]);

        $global = Meta::factory()->create([
            'created_by' => $org['direcao']->id,
            'tipo_escopo' => 'global',
            'titulo' => 'Meta Empresa',
        ]);

        $lista = collect($this->actingAs($org['direcao'])->getJson('/api/metas?ano=2026&mes=9')->json())
            ->keyBy('titulo');

        $this->assertEqualsCanonicalizing(
            [$org['colaborador']->id],
            collect($lista['Meta Individual']['escopo_usuarios'])->pluck('id')->all()
        );
        $this->assertEqualsCanonicalizing(
            [$org['colaborador']->id],
            collect($lista['Meta Cargo']['escopo_usuarios'])->pluck('id')->all()
        );
        $this->assertEqualsCanonicalizing(
            [$org['lider']->id, $org['colaborador']->id],
            collect($lista['Meta Setor']['escopo_usuarios'])->pluck('id')->all()
        );
        $this->assertEqualsCanonicalizing(
            [$org['direcao']->id, $org['lider']->id, $org['colaborador']->id, $org['outroLider']->id],
            collect($lista['Meta Empresa']['escopo_usuarios'])->pluck('id')->all()
        );
        $this->assertFalse(
            collect($lista['Meta Empresa']['escopo_usuarios'])->pluck('name')->contains('Inativo TI')
        );
    }
}
