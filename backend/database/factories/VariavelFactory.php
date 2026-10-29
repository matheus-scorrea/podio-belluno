<?php

namespace Database\Factories;

use App\Models\DwConexao;
use App\Models\Variavel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Variavel>
 */
class VariavelFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nome' => fake()->unique()->words(3, true),
            'chave' => fake()->unique()->lexify('var_????'),
            'conexao_id' => DwConexao::factory(),
            'unidade' => '%',
            'descricao' => fake()->optional()->sentence(),
            'consulta_sql' => 'SELECT valor FROM fato_indicadores WHERE codigo = \'nps\' AND ano = :ano AND mes = :mes',
            'consulta_sql_testada' => null,
            'status' => Variavel::RASCUNHO,
            'ultimo_erro' => null,
            'testado_em' => null,
            'sincronizado_em' => null,
        ];
    }

    public function publicada(): static
    {
        return $this->state(function (array $attributes) {
            $sql = $attributes['consulta_sql'];

            return [
                'status' => Variavel::PUBLICADA,
                'consulta_sql_testada' => $sql,
                'testado_em' => now(),
            ];
        })->afterCreating(function (Variavel $variavel) {
            $variavel->update(['conexao_id_testada' => $variavel->conexao_id]);
        });
    }
}
