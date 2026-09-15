<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= 'password',
            'remember_token' => Str::random(10),
            'is_direcao' => false,
            'ativo' => true,
            'must_change_password' => false,
            'departamento_id' => null,
            'cargo_id' => null,
        ];
    }

    public function direcao(): static
    {
        return $this->state(fn () => [
            'is_direcao' => true,
            'departamento_id' => null,
            'cargo_id' => null,
        ]);
    }
}
