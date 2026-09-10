<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_retorna_perfil_do_usuario(): void
    {
        $user = User::factory()->direcao()->create([
            'email' => 'direcao@bellunotec.com',
            'password' => 'password',
        ]);

        $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Referer' => 'http://localhost:5173',
        ])->postJson('/api/login', [
            'email' => 'direcao@bellunotec.com',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('data.is_direcao', true)
            ->assertJsonPath('data.perfil', 'direcao');

        $this->actingAs($user)->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'direcao@bellunotec.com');
    }

    public function test_usuario_inativo_nao_autentica(): void
    {
        User::factory()->create([
            'email' => 'off@bellunotec.com',
            'password' => 'password',
            'ativo' => false,
        ]);

        $this->postJson('/api/login', [
            'email' => 'off@bellunotec.com',
            'password' => 'password',
        ])->assertStatus(422);
    }

    public function test_sessao_de_usuario_inativo_e_encerrada(): void
    {
        $user = User::factory()->create(['ativo' => true]);

        $this->actingAs($user)->getJson('/api/me')->assertOk();

        $user->update(['ativo' => false]);

        $this->actingAs($user)->getJson('/api/me')->assertForbidden();
    }

    public function test_login_e_limitado_por_tentativas(): void
    {
        User::factory()->create([
            'email' => 'alvo@bellunotec.com',
            'password' => 'password',
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'email' => 'alvo@bellunotec.com',
                'password' => 'errada',
            ])->assertStatus(422);
        }

        $this->postJson('/api/login', [
            'email' => 'alvo@bellunotec.com',
            'password' => 'errada',
        ])->assertStatus(429);
    }
}
