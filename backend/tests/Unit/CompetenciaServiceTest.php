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

    public function test_lancamento_abre_mes_anterior_ate_o_dia_7(): void
    {
        $service = new CompetenciaService;

        $this->assertTrue($service->competenciaAbertaParaLancamento(2026, 10, Carbon::parse('2026-10-13')));
        $this->assertTrue($service->competenciaAbertaParaLancamento(2026, 9, Carbon::parse('2026-10-01')));
        $this->assertTrue($service->competenciaAbertaParaLancamento(2026, 9, Carbon::parse('2026-10-07')));
        $this->assertFalse($service->competenciaAbertaParaLancamento(2026, 9, Carbon::parse('2026-10-08')));
        $this->assertFalse($service->competenciaAbertaParaLancamento(2026, 8, Carbon::parse('2026-10-05')));
        $this->assertTrue($service->competenciaAbertaParaLancamento(2025, 12, Carbon::parse('2026-01-07')));
        $this->assertFalse($service->competenciaAbertaParaLancamento(2025, 12, Carbon::parse('2026-01-08')));
    }
}
