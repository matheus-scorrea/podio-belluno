<?php

namespace Database\Factories;

use App\Models\DwConexao;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DwConexao>
 */
class DwConexaoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nome' => fake()->unique()->company(),
            'driver' => 'sqlite',
            'host' => '127.0.0.1',
            'port' => 3306,
            'database' => ':memory:',
            'username' => 'readonly',
            'senha' => 'secret',
            'ssl' => false,
            'ativa' => true,
        ];
    }
}
