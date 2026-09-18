<?php

namespace Tests\Unit;

use App\Models\Meta;
use App\Support\BonusPagamento;
use Tests\TestCase;

class BonusPagamentoTest extends TestCase
{
    public function test_fixo_paga_tudo_ou_nada(): void
    {
        $meta = $this->meta(['modo_bonus' => 'fixo', 'valor_bonus' => 200]);

        $this->assertEquals(0, BonusPagamento::calcular($meta, 99, 100, 99));
        $this->assertEquals(200, BonusPagamento::calcular($meta, 100, 100, 100));
        $this->assertEquals(200, BonusPagamento::calcular($meta, 180, 100, 180));
    }

    public function test_linear_paga_proporcional_depois_do_piso(): void
    {
        $meta = $this->meta([
            'modo_bonus' => 'linear',
            'valor_bonus' => 200,
            'bonus_piso_percentual' => 100,
        ]);

        $this->assertEquals(0, BonusPagamento::calcular($meta, 8, 10, 80));
        $this->assertEquals(200, BonusPagamento::calcular($meta, 10, 10, 100));
        $this->assertEquals(300, BonusPagamento::calcular($meta, 15, 10, 150));
        $this->assertEquals(400, BonusPagamento::calcular($meta, 20, 10, 200));
    }

    public function test_linear_paga_a_partir_do_piso_antes_do_alvo(): void
    {
        $meta = $this->meta([
            'modo_bonus' => 'linear',
            'valor_bonus' => 200,
            'bonus_piso_percentual' => 80,
        ]);

        $this->assertEquals(0, BonusPagamento::calcular($meta, 7, 10, 70));
        $this->assertEquals(160, BonusPagamento::calcular($meta, 8, 10, 80));
        $this->assertEquals(180, BonusPagamento::calcular($meta, 9, 10, 90));
    }

    public function test_marco_e_menor_melhor_ficam_no_modo_fixo(): void
    {
        $marco = $this->meta(['chart_tipo' => 'marco', 'modo_bonus' => 'linear', 'valor_bonus' => 50]);
        $this->assertSame('fixo', $marco->modoBonus());
        $this->assertEquals(50, BonusPagamento::calcular($marco, 1, 1, 100));

        $churn = $this->meta([
            'sentido' => 'menor_melhor',
            'modo_bonus' => 'linear',
            'valor_bonus' => 80,
        ]);
        $this->assertSame('fixo', $churn->modoBonus());
        $this->assertEquals(80, BonusPagamento::calcular($churn, 1, 100, 100));
        $this->assertEquals(80, BonusPagamento::calcular($churn, 1, 100, 250));
    }

    public function test_linear_respeita_teto(): void
    {
        $meta = $this->meta([
            'modo_bonus' => 'linear',
            'valor_bonus' => 200,
            'bonus_piso_percentual' => 100,
            'bonus_teto_percentual' => 150,
        ]);

        $this->assertEquals(300, BonusPagamento::calcular($meta, 20, 10, 200));
    }

    public function test_unidade_paga_extra_acima_do_alvo(): void
    {
        $meta = $this->meta([
            'modo_bonus' => 'unidade',
            'valor_bonus' => 200,
            'bonus_por_unidade_extra' => 25,
        ]);

        $this->assertEquals(0, BonusPagamento::calcular($meta, 9, 10, 90));
        $this->assertEquals(200, BonusPagamento::calcular($meta, 10, 10, 100));
        $this->assertEquals(300, BonusPagamento::calcular($meta, 14, 10, 140));
    }

    /**
     * @param  array<string, mixed>  $attrs
     */
    private function meta(array $attrs): Meta
    {
        return new Meta(array_merge([
            'chart_tipo' => 'progress_bar',
            'sentido' => 'maior_melhor',
            'valor_bonus' => 0,
            'modo_bonus' => 'fixo',
        ], $attrs));
    }
}
