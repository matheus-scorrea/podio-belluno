<?php

namespace App\Services;

use App\Models\Meta;
use App\Models\MetaCompetencia;
use Carbon\Carbon;

class CompetenciaService
{
    public function upsert(Meta $meta, int $ano, int $mes, float $valorMeta): MetaCompetencia
    {
        return MetaCompetencia::query()->updateOrCreate(
            ['meta_id' => $meta->id, 'ano' => $ano, 'mes' => $mes],
            ['valor_meta' => $valorMeta],
        );
    }

    public function anterior(int $ano, int $mes): array
    {
        if ($mes === 1) {
            return [$ano - 1, 12];
        }

        return [$ano, $mes - 1];
    }

    public function abrir(int $ano, int $mes, ?int $origemAno = null, ?int $origemMes = null): int
    {
        [$origemAno, $origemMes] = $origemAno && $origemMes
            ? [$origemAno, $origemMes]
            : $this->anterior($ano, $mes);

        $origem = MetaCompetencia::query()
            ->where('ano', $origemAno)
            ->where('mes', $origemMes)
            ->get();

        $criadas = 0;
        foreach ($origem as $comp) {
            $comp->loadMissing('meta');
            $realizadoInicial = $comp->meta?->isMarco() ? (float) $comp->valor_realizado : 0;
            $nova = MetaCompetencia::query()->firstOrCreate(
                ['meta_id' => $comp->meta_id, 'ano' => $ano, 'mes' => $mes],
                ['valor_meta' => $comp->valor_meta, 'valor_realizado' => $realizadoInicial],
            );
            if ($nova->wasRecentlyCreated) {
                $criadas++;
            }
        }

        return $criadas;
    }

    public function hidratar(Meta $meta, int $ano, int $mes): Meta
    {
        $comp = $meta->relationLoaded('competencias')
            ? $meta->competencias->first(fn (MetaCompetencia $c) => $c->ano === $ano && $c->mes === $mes)
            : $meta->competencias()->where('ano', $ano)->where('mes', $mes)->first();

        $meta->setAttribute('ano', $ano);
        $meta->setAttribute('mes', $mes);
        $meta->setAttribute('valor_meta', (float) ($comp?->valor_meta ?? 0));
        $meta->setAttribute('valor_realizado', (float) ($comp?->valor_realizado ?? 0));

        return $meta;
    }

    public function dataNoPeriodo(Carbon $evento, int $ano, int $mes): bool
    {
        return $evento->year === $ano && $evento->month === $mes;
    }
}
