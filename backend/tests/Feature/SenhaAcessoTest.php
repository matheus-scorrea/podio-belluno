<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\SenhaTemporaria;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SenhaAcessoTest extends TestCase
{
    use RefreshDatabase;

    public function test_cadastro_gera_senha_temporaria_e_bloqueia_o_painel_ate_trocar(): void
    {
        $org = $this->createOrg();

        $resposta = $this->actingAs($org['direcao'])->postJson('/api/usuarios', [
            'name' => 'Carla Souza',
            'email' => 'carla@bellunotec.com',
            'departamento_id' => $org['dept']->id,
            'cargo_id' => $org['comumCargo']->id,
        ])->assertCreated();

        $senha = $resposta->json('senha_temporaria');
        $pessoa = User::query()->where('email', 'carla@bellunotec.com')->firstOrFail();

        $this->assertTrue($pessoa->must_change_password);
        $this->assertStringContainsString('http://localhost:5173', $resposta->json('mensagem'));
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check($senha, $pessoa->password));

        $this->actingAs($pessoa)->getJson('/api/dashboard?ano=2026&mes=9')
            ->assertForbidden()
            ->assertJsonPath('code', 'must_change_password');

        $this->actingAs($pessoa)->putJson('/api/me/senha', [
            'password' => $senha,
            'password_confirmation' => $senha,
        ])->assertUnprocessable();

        $this->actingAs($pessoa)->putJson('/api/me/senha', [
            'password' => 'SenhaNova1',
            'password_confirmation' => 'SenhaNova1',
        ])->assertOk()->assertJsonPath('data.must_change_password', false);

        $this->actingAs($pessoa->fresh())->getJson('/api/dashboard?ano=2026&mes=9')->assertOk();
    }

    public function test_redefinir_senha_na_conta_exige_senha_atual(): void
    {
        $org = $this->createOrg();

        $this->actingAs($org['colaborador'])->putJson('/api/me/senha', [
            'password' => 'SenhaNova1',
            'password_confirmation' => 'SenhaNova1',
        ])->assertUnprocessable();

        $this->actingAs($org['colaborador'])->putJson('/api/me/senha', [
            'senha_atual' => 'errada',
            'password' => 'SenhaNova1',
            'password_confirmation' => 'SenhaNova1',
        ])->assertUnprocessable();

        $this->actingAs($org['colaborador'])->putJson('/api/me/senha', [
            'senha_atual' => 'password',
            'password' => 'SenhaNova1',
            'password_confirmation' => 'SenhaNova1',
        ])->assertOk()->assertJsonPath('data.must_change_password', false);

        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('SenhaNova1', $org['colaborador']->fresh()->password));
    }

    public function test_direcao_emite_nova_senha_temporaria_para_outra_pessoa(): void
    {
        $org = $this->createOrg();

        $resposta = $this->actingAs($org['direcao'])
            ->postJson("/api/usuarios/{$org['colaborador']->id}/senha-temporaria")
            ->assertOk();

        $senha = $resposta->json('senha_temporaria');
        $this->assertNotEmpty($senha);
        $this->assertTrue($org['colaborador']->fresh()->must_change_password);

        $this->actingAs($org['direcao'])
            ->postJson("/api/usuarios/{$org['direcao']->id}/senha-temporaria")
            ->assertUnprocessable();

        $this->actingAs($org['colaborador'])
            ->postJson("/api/usuarios/{$org['lider']->id}/senha-temporaria")
            ->assertForbidden();
    }

    public function test_senha_temporaria_atende_as_regras(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $senha = SenhaTemporaria::gerar();
            $this->assertGreaterThanOrEqual(8, strlen($senha));
            $this->assertMatchesRegularExpression('/[A-Z]/', $senha);
            $this->assertMatchesRegularExpression('/[a-z]/', $senha);
            $this->assertMatchesRegularExpression('/[2-9]/', $senha);
        }
    }
}
