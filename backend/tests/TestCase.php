<?php

namespace Tests;

use App\Models\Cargo;
use App\Models\Departamento;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication(): Application
    {
        $this->forceInMemorySqlite();

        $app = require Application::inferBasePath().'/bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
    }

    private function forceInMemorySqlite(): void
    {
        foreach ([
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => ':memory:',
            'DB_URL' => '',
            'DB_HOST' => '',
            'SESSION_DRIVER' => 'array',
            'CACHE_STORE' => 'array',
            'QUEUE_CONNECTION' => 'sync',
        ] as $key => $value) {
            putenv($key.'='.$value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }

    /**
     * @return array{
     *     dept: Departamento,
     *     outro: Departamento,
     *     liderCargo: Cargo,
     *     comumCargo: Cargo,
     *     direcao: User,
     *     lider: User,
     *     colaborador: User,
     *     outroLider: User
     * }
     */
    protected function createOrg(): array
    {
        $dept = Departamento::factory()->create(['nome' => 'TI']);
        $liderCargo = Cargo::factory()->create(['nome' => 'Líder de TI', 'departamento_id' => $dept->id]);
        $comumCargo = Cargo::factory()->create(['nome' => 'Analista de TI', 'departamento_id' => $dept->id]);
        $dept->update(['cargo_lider_id' => $liderCargo->id]);

        $outro = Departamento::factory()->create(['nome' => 'RH']);
        $outroLiderCargo = Cargo::factory()->create(['nome' => 'Líder de RH', 'departamento_id' => $outro->id]);
        $outro->update(['cargo_lider_id' => $outroLiderCargo->id]);

        return [
            'dept' => $dept,
            'outro' => $outro,
            'liderCargo' => $liderCargo,
            'comumCargo' => $comumCargo,
            'direcao' => User::factory()->direcao()->create(),
            'lider' => User::factory()->create([
                'departamento_id' => $dept->id,
                'cargo_id' => $liderCargo->id,
            ]),
            'colaborador' => User::factory()->create([
                'departamento_id' => $dept->id,
                'cargo_id' => $comumCargo->id,
            ]),
            'outroLider' => User::factory()->create([
                'departamento_id' => $outro->id,
                'cargo_id' => $outroLiderCargo->id,
            ]),
        ];
    }
}
