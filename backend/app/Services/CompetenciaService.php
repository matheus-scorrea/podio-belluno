<?php

namespace App\Services;

use App\Models\Meta;
use App\Models\MetaCompetencia;
use Carbon\Carbon;

class CompetenciaService
{
    /**
     * @param  list<array<string, mixed>>|null  $niveisComissao
     */
    public function upsert(Meta $meta, int $ano, int $mes, float $valorMeta, ?array $niveisComissao = null): MetaCompetencia
    {
        $valores = ['valor_meta' => $valorMeta];
        if ($meta->isComissao()) {
            $valores['niveis_comissao'] = $niveisComissao ?? $meta->niveis_comissao;
        }

        return MetaCompetencia::query()->updateOrCreate(
            ['meta_id' => $meta->id, 'ano' => $ano, 'mes' => $mes],
            $valores,
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
                [
                    'valor_meta' => $comp->valor_meta,
                    'valor_realizado' => $realizadoInicial,
                    'niveis_comissao' => $comp->niveis_comissao ?? $comp->meta?->niveis_comissao,
                ],
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
        if ($meta->isComissao() && $comp?->niveis_comissao) {
            $meta->setAttribute('niveis_comissao', $comp->niveis_comissao);
        }

        return $meta;
    }

    public function dataNoPeriodo(Carbon $evento, int $ano, int $mes): bool
    {
        return $evento->year === $ano && $evento->month === $mes;
    }
}
