<?php

namespace App\Services;

class ComissaoService
{
    /**
     * @return list<array{nome: string, venda_min: float, adesao_min: float, percentual: float, premio: float}>
     */
    public static function tabelaBelluno(): array
    {
        return [
            ['nome' => 'META 1', 'venda_min' => 15000, 'adesao_min' => 7500, 'percentual' => 5, 'premio' => 500],
            ['nome' => 'META 2', 'venda_min' => 15000, 'adesao_min' => 15000, 'percentual' => 5, 'premio' => 1000],
            ['nome' => 'META 3', 'venda_min' => 20000, 'adesao_min' => 10000, 'percentual' => 6, 'premio' => 1000],
            ['nome' => 'META 4', 'venda_min' => 20000, 'adesao_min' => 20000, 'percentual' => 6, 'premio' => 1500],
            ['nome' => 'META 5', 'venda_min' => 25000, 'adesao_min' => 12500, 'percentual' => 7, 'premio' => 1500],
            ['nome' => 'META 6', 'venda_min' => 25000, 'adesao_min' => 25000, 'percentual' => 7, 'premio' => 2000],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $niveis
     * @return array{
     *     nivel: string|null,
     *     percentual: float,
     *     premio: float,
     *     comissao: float,
     *     total: float,
     *     venda: float,
     *     adesao: float
     * }
     */
    public function calcular(array $niveis, float $venda, float $adesao): array
    {
        $vazio = [
            'nivel' => null,
            'percentual' => 0.0,
            'premio' => 0.0,
            'comissao' => 0.0,
            'total' => 0.0,
            'venda' => $venda,
            'adesao' => $adesao,
        ];

        $faixas = $this->niveisValidos($niveis);
        for ($i = count($faixas) - 1; $i >= 0; $i--) {
            $faixa = $faixas[$i];
            if ($venda + 0.00001 >= $faixa['venda_min'] && $adesao + 0.00001 >= $faixa['adesao_min']) {
                $comissao = round($venda * $faixa['percentual'] / 100, 2);

                return [
                    'nivel' => $faixa['nome'] !== '' ? $faixa['nome'] : 'META '.($i + 1),
                    'percentual' => $faixa['percentual'],
                    'premio' => $faixa['premio'],
                    'comissao' => $comissao,
                    'total' => round($comissao + $faixa['premio'], 2),
                    'venda' => $venda,
                    'adesao' => $adesao,
                ];
            }
        }

        return $vazio;
    }

    /**
     * @return list<array{nome: string, venda_min: float, adesao_min: float, percentual: float, premio: float}>
     */
    public function niveisValidos(mixed $niveis): array
    {
        if (! is_array($niveis)) {
            return [];
        }

        $saida = [];
        foreach ($niveis as $nivel) {
            if (! is_array($nivel)) {
                continue;
            }

            $saida[] = [
                'nome' => trim((string) ($nivel['nome'] ?? '')),
                'venda_min' => (float) ($nivel['venda_min'] ?? 0),
                'adesao_min' => (float) ($nivel['adesao_min'] ?? 0),
                'percentual' => (float) ($nivel['percentual'] ?? 0),
                'premio' => (float) ($nivel['premio'] ?? 0),
            ];
        }

        return $saida;
    }

    /**
     * @param  list<array<string, mixed>>  $niveis
     */
    public function maiorVendaMin(array $niveis): float
    {
        $faixas = $this->niveisValidos($niveis);
        if ($faixas === []) {
            return 0.0;
        }

        return max(array_column($faixas, 'venda_min'));
    }
}
