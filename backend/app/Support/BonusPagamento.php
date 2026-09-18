<?php

namespace App\Support;

use App\Models\Meta;

class BonusPagamento
{
    /**
     * @return list<array{nome: string, quantidade_min: float, valor_por_unidade: float}>
     */
    public static function tabelaSdrReunioes(): array
    {
        return [
            ['nome' => 'Meta 1', 'quantidade_min' => 20.0, 'valor_por_unidade' => 10.0],
            ['nome' => 'Meta 2', 'quantidade_min' => 30.0, 'valor_por_unidade' => 12.0],
            ['nome' => 'Meta 3', 'quantidade_min' => 35.0, 'valor_por_unidade' => 15.0],
        ];
    }

    public static function calcular(Meta $meta, float $realizado, float $alvo, float $percentual): float
    {
        $base = (float) $meta->valor_bonus;

        return match ($meta->modoBonus()) {
            'linear' => self::linear($meta, $percentual, $base),
            'unidade' => self::unidade($meta, $realizado, $alvo, $base),
            'faixa_unidade' => self::faixaUnidade($meta, $realizado),
            'por_unidade' => self::porUnidade($realizado, $base),
            default => $percentual + 0.00001 >= 100 ? round($base, 2) : 0.0,
        };
    }

    public static function nivelFaixa(Meta $meta, float $realizado): ?string
    {
        if ($meta->modoBonus() !== 'faixa_unidade') {
            return null;
        }

        $faixa = self::resolverFaixa($meta->niveis_faixa ?? [], $realizado);
        if ($faixa === null || $faixa['nome'] === '') {
            return null;
        }

        return $faixa['nome'];
    }

    /**
     * @return list<array{nome: string, quantidade_min: float, valor_por_unidade: float}>
     */
    public static function faixasValidas(mixed $niveis): array
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
                'quantidade_min' => (float) ($nivel['quantidade_min'] ?? 0),
                'valor_por_unidade' => (float) ($nivel['valor_por_unidade'] ?? 0),
            ];
        }

        usort($saida, fn (array $a, array $b) => $a['quantidade_min'] <=> $b['quantidade_min']);

        return $saida;
    }

    /**
     * @return array{nome: string, quantidade_min: float, valor_por_unidade: float}|null
     */
    public static function resolverFaixa(mixed $niveis, float $realizado): ?array
    {
        $faixas = self::faixasValidas($niveis);
        for ($i = count($faixas) - 1; $i >= 0; $i--) {
            if ($realizado + 0.00001 >= $faixas[$i]['quantidade_min']) {
                return $faixas[$i];
            }
        }

        return null;
    }

    private static function linear(Meta $meta, float $percentual, float $base): float
    {
        if ($percentual + 0.00001 < $meta->pisoBonus()) {
            return 0.0;
        }

        $aplicado = $percentual;
        $teto = $meta->bonus_teto_percentual;
        if ($teto !== null) {
            $aplicado = min($aplicado, (float) $teto);
        }

        return round($base * $aplicado / 100, 2);
    }

    private static function unidade(Meta $meta, float $realizado, float $alvo, float $base): float
    {
        if ($alvo <= 0 || $realizado + 0.00001 < $alvo) {
            return 0.0;
        }

        $extra = (float) ($meta->bonus_por_unidade_extra ?? 0);

        return round($base + ($realizado - $alvo) * $extra, 2);
    }

    private static function faixaUnidade(Meta $meta, float $realizado): float
    {
        $faixa = self::resolverFaixa($meta->niveis_faixa ?? [], $realizado);
        if ($faixa === null) {
            return 0.0;
        }

        return round($realizado * $faixa['valor_por_unidade'], 2);
    }

    private static function porUnidade(float $realizado, float $taxa): float
    {
        if ($realizado <= 0 || $taxa <= 0) {
            return 0.0;
        }

        return round($realizado * $taxa, 2);
    }
}
