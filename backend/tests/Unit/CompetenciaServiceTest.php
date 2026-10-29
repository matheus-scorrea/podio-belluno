<?php

namespace Tests\Unit;

use App\Services\CompetenciaService;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class CompetenciaServiceTest extends TestCase
{
    public function test_destinos_clone_sao_mes_atual_e_proximo(): void
    {
        $service = new CompetenciaService;

        $this->assertSame(
            [[2026, 10], [2026, 11]],
            $service->destinosClonePermitidos(Carbon::parse('2026-10-29'))
        );
        $this->assertSame(
            [[2026, 12], [2027, 1]],
            $service->destinosClonePermitidos(Carbon::parse('2026-12-31'))
        );
        $this->assertTrue($service->destinoClonePermitido(2026, 11, Carbon::parse('2026-10-29')));
        $this->assertFalse($service->destinoClonePermitido(2026, 9, Carbon::parse('2026-10-29')));
    }
}
