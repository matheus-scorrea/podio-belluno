<?php

namespace Database\Factories;

use App\Models\Cargo;
use App\Models\Departamento;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Cargo>
 */
class CargoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nome' => fake()->jobTitle(),
            'departamento_id' => Departamento::factory(),
            'ativo' => true,
        ];
    }
}
