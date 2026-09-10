<?php

namespace Database\Factories;

use App\Models\Meta;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Meta>
 */
class MetaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'titulo' => fake()->sentence(3),
            'descricao' => fake()->optional()->sentence(),
            'tipo_escopo' => 'global',
            'unidade' => '%',
            'sentido' => 'maior_melhor',
            'agregacao' => 'media',
            'chart_tipo' => 'gauge',
            'chart_cor' => '#00A8E8',
            'valor_bonus' => 0,
            'created_by' => User::factory()->direcao(),
            'ativo' => true,
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Meta $meta) {
            if ($meta->competencias()->exists()) {
                return;
            }

            $meta->competencias()->create([
                'ano' => 2026,
                'mes' => 9,
                'valor_meta' => 100,
                'valor_realizado' => 0,
            ]);
        });
    }
}
