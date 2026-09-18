<?php

namespace App\Support;

class IndicadorStatus
{
    public static function percentual(float $realizado, float $meta, string $sentido, bool $limitar = true): float
    {
        if ($meta <= 0) {
            return 0.0;
        }

        if ($sentido === 'menor_melhor') {
            if ($realizado <= 0) {
                return 100.0;
            }

            $valor = ($meta / $realizado) * 100;

            return round($limitar ? min($valor, 100) : $valor, 1);
        }

        $valor = ($realizado / $meta) * 100;

        return round($limitar ? min($valor, 100) : $valor, 1);
    }

    public static function status(float $percentual): string
    {
        if ($percentual >= 100) {
            return 'concluida';
        }
        if ($percentual >= 70) {
            return 'esperado';
        }
        if ($percentual >= 40) {
            return 'atencao';
        }

        return 'abaixo';
    }

    public static function cor(string $status): string
    {
        return match ($status) {
            'concluida' => '#0077B6',
            'esperado' => '#10B981',
            'atencao' => '#F59E0B',
            default => '#EF4444',
        };
    }
}
