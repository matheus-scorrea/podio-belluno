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

    public function test_piso_paga_primeira_faixa_quando_nenhum_gatilho_bate(): void
    {
        $servico = new ComissaoService;
        $tabela = ComissaoService::tabelaBelluno();

        $semPiso = $servico->calcular($tabela, 10000, 3000);
        $this->assertNull($semPiso['nivel']);
        $this->assertEquals(0, $semPiso['total']);

        $comPiso = $servico->calcular($tabela, 10000, 3000, true);
        $this->assertSame('META 1', $comPiso['nivel']);
        $this->assertEquals(5.0, $comPiso['percentual']);
        $this->assertEquals(500.0, $comPiso['comissao']);
        $this->assertEquals(500.0, $comPiso['premio']);
        $this->assertEquals(1000.0, $comPiso['total']);
    }

    public function test_piso_nao_paga_sem_lancamento_e_nao_rebaixa_faixa_maior(): void
    {
        $servico = new ComissaoService;
        $tabela = ComissaoService::tabelaBelluno();

        $vazio = $servico->calcular($tabela, 0, 0, true);
        $this->assertNull($vazio['nivel']);
        $this->assertEquals(0, $vazio['total']);

        $meta6 = $servico->calcular($tabela, 25000, 25000, true);
        $this->assertSame('META 6', $meta6['nivel']);
        $this->assertEquals(3750.0, $meta6['total']);
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
