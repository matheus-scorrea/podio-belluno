<?php

namespace Tests\Unit;

use App\Support\IndicadorStatus;
use App\Support\MetasMarco;
use PHPUnit\Framework\TestCase;

class IndicadorStatusTest extends TestCase
{
    public function test_percentual_fica_entre_zero_e_cem(): void
    {
        $this->assertSame(0.0, IndicadorStatus::percentual(0, 100, 'maior_melhor'));
        $this->assertSame(50.0, IndicadorStatus::percentual(50, 100, 'maior_melhor'));
        $this->assertSame(100.0, IndicadorStatus::percentual(100, 100, 'maior_melhor'));
        $this->assertSame(100.0, IndicadorStatus::percentual(250, 100, 'maior_melhor'));
        $this->assertSame(250.0, IndicadorStatus::percentual(250, 100, 'maior_melhor', false));
        $this->assertSame(100.0, IndicadorStatus::percentual(1, 100, 'menor_melhor'));
    }

    public function test_marco_vira_zero_ou_um(): void
    {
        $this->assertSame(1.0, MetasMarco::realizadoComoMarco(100, 100));
        $this->assertSame(0.0, MetasMarco::realizadoComoMarco(0, 100));
        $this->assertSame(1.0, MetasMarco::realizadoComoMarco(1, 1));
        $this->assertSame(0.0, MetasMarco::realizadoComoMarco(0, 0));
        $this->assertSame(1.0, MetasMarco::realizadoComoMarco(8, 0));
    }
}
