<?php

namespace Tests\Unit;

use App\Services\ComissaoService;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ComissaoServiceTest extends TestCase
{
    public static function tabelaBellunoProvider(): array
    {
        return [
            'meta 1' => [15000.0, 7500.0, 'META 1', 750.0, 500.0, 1250.0],
            'meta 2' => [15000.0, 15000.0, 'META 2', 750.0, 1000.0, 1750.0],
            'meta 6' => [25000.0, 25000.0, 'META 6', 1750.0, 2000.0, 3750.0],
            'meta 3 por adesao abaixo da 5' => [25000.0, 10000.0, 'META 3', 1500.0, 1000.0, 2500.0],
            'nenhuma' => [14999.0, 20000.0, null, 0.0, 0.0, 0.0],
        ];
    }

    #[DataProvider('tabelaBellunoProvider')]
    public function test_enquadra_tabela_belluno(
        float $venda,
        float $adesao,
        ?string $nivel,
        float $comissao,
        float $premio,
        float $total,
    ): void {
        $resultado = (new ComissaoService)->calcular(ComissaoService::tabelaBelluno(), $venda, $adesao);

        $this->assertSame($nivel, $resultado['nivel']);
        $this->assertEquals($comissao, $resultado['comissao']);
        $this->assertEquals($premio, $resultado['premio']);
        $this->assertEquals($total, $resultado['total']);
    }
}
