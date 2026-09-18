<?php

namespace App\Services;

use App\Models\MetaCompetencia;
use App\Models\MetaLancamento;
use App\Models\User;
use App\Models\UsuarioCompetencia;
use Illuminate\Support\Collection;

class ResultadosService
{
    public function __construct(private FechamentoService $fechamento) {}

    /**
     * @return array<string, mixed>
     */
    public function montar(User $user, int $ano): array
    {
        $mesesComMeta = MetaCompetencia::query()
            ->where('ano', $ano)
            ->distinct()
            ->orderBy('mes')
            ->pluck('mes');

        $meses = [];
        foreach ($mesesComMeta as $mes) {
            $retrato = $this->garantirRetrato($user, $ano, (int) $mes);
            $retrato->load(['departamento', 'cargo']);
            $itens = $this->fechamento->itensDoUsuario($user, $ano, (int) $mes);

            $meses[] = [
                'mes' => (int) $mes,
                'departamento' => $retrato->departamento?->nome,
                'cargo' => $retrato->cargo?->nome,
                'bonus_total' => round((float) collect($itens)->sum('valor_bonus'), 2),
                'batidas' => collect($itens)->where('bateu', true)->count(),
                'total_metas' => count($itens),
                'itens' => $itens,
            ];
        }

        /** @var Collection<int, array<string, mixed>> $todas */
        $todas = collect($meses)->flatMap(fn (array $mes) => $mes['itens']);
        $totalMetas = $todas->count();
        $batidas = $todas->where('bateu', true)->count();

        return [
            'ano' => $ano,
            'kpis' => [
                'meses_com_meta' => count($meses),
                'metas' => $totalMetas,
                'batidas' => $batidas,
                'desempenho_medio' => $totalMetas > 0 ? round($batidas / $totalMetas * 100, 1) : 0,
                'total_bonus' => round((float) collect($meses)->sum('bonus_total'), 2),
            ],
            'meses' => $meses,
        ];
    }

    public function garantirRetrato(User $user, int $ano, int $mes): UsuarioCompetencia
    {
        $existente = UsuarioCompetencia::query()
            ->where('user_id', $user->id)
            ->where('ano', $ano)
            ->where('mes', $mes)
            ->first();

        if ($existente) {
            return $existente;
        }

        $lancamento = MetaLancamento::query()
            ->where(function ($q) use ($user) {
                $q->where('usuario_alvo_id', $user->id)
                    ->orWhere(function ($inner) use ($user) {
                        $inner->whereNull('usuario_alvo_id')->where('lancado_por', $user->id);
                    });
            })
            ->whereYear('data_evento', $ano)
            ->whereMonth('data_evento', $mes)
            ->where(fn ($q) => $q->whereNotNull('departamento_id')->orWhereNotNull('cargo_id'))
            ->latest('id')
            ->first();

        return UsuarioCompetencia::query()->create([
            'user_id' => $user->id,
            'ano' => $ano,
            'mes' => $mes,
            'departamento_id' => $lancamento?->departamento_id ?? $user->departamento_id,
            'cargo_id' => $lancamento?->cargo_id ?? $user->cargo_id,
        ]);
    }
}
