<?php

namespace App\Support;

use App\Models\Meta;

final class AssinaturaEscopo
{
    /**
     * @param  list<int>  $ids
     */
    public static function de(string $tipoEscopo, array $ids = []): string
    {
        $normalizados = collect($ids)->map(fn ($id) => (int) $id)->filter()->unique()->sort()->values()->all();

        return $tipoEscopo.':'.implode(',', $normalizados);
    }

    public static function daMeta(Meta $meta): string
    {
        $meta->loadMissing(['usuarios', 'cargos', 'departamentos']);

        $ids = match ($meta->tipo_escopo) {
            'individual' => $meta->usuarios->pluck('id')->all(),
            'cargo' => $meta->cargos->pluck('id')->all(),
            'departamento' => $meta->departamentos->pluck('id')->all(),
            default => [],
        };

        return self::de($meta->tipo_escopo, $ids);
    }
}
