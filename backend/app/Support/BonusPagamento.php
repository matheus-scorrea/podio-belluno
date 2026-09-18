<?php

namespace App\Support;

use App\Models\Meta;

class BonusPagamento
{
    public static function calcular(Meta $meta, float $realizado, float $alvo, float $percentual): float
    {
        $base = (float) $meta->valor_bonus;

        return match ($meta->modoBonus()) {
            'linear' => self::linear($meta, $percentual, $base),
            'unidade' => self::unidade($meta, $realizado, $alvo, $base),
            default => $percentual + 0.00001 >= 100 ? round($base, 2) : 0.0,
        };
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
}
