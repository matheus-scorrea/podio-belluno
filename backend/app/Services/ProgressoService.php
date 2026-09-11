<?php

namespace App\Services;

use App\Models\Meta;
use App\Models\MetaCompetencia;
use App\Models\MetaLancamento;
use App\Models\User;
use Carbon\Carbon;

use Illuminate\Support\Facades\DB;

class ProgressoService
{
    public function __construct(private AcessoMetas $acesso) {}

    public function lancar(User $user, Meta $meta, array $dados): MetaLancamento
    {
        $alvo = $this->normalizarAlvo($user, $meta, $dados);
        if (! $this->acesso->podeLancar($user, $meta, $alvo)) {
            abort(403);
        }
        $evento = Carbon::parse($dados['data_evento']);

        return DB::transaction(function () use ($user, $meta, $dados, $alvo, $evento) {
            $valor = (float) $dados['valor_realizado'];
            if ($meta->isMarco()) {
                $valor = $valor > 0 ? 1.0 : 0.0;
            }

            $lancamento = MetaLancamento::query()->create([
                'meta_id' => $meta->id,
                'data_evento' => $dados['data_evento'],
                'valor_realizado' => $valor,
                'valor_adesao' => $meta->isComissao() ? (float) ($dados['valor_adesao'] ?? 0) : null,
                'observacao' => $dados['observacao'] ?? null,
                'departamento_id' => $alvo['departamento_id'],
                'cargo_id' => $alvo['cargo_id'],
                'usuario_alvo_id' => $alvo['usuario_alvo_id'],
                'lancado_por' => $user->id,
            ]);

            $this->refreshAgregado($meta, $evento->year, $evento->month);

            return $lancamento;
        });
    }

    public function refreshAgregado(Meta $meta, int $ano, int $mes): void
    {
        $competencia = MetaCompetencia::query()->firstOrCreate(
            ['meta_id' => $meta->id, 'ano' => $ano, 'mes' => $mes],
            ['valor_meta' => $this->ultimoAlvo($meta) ?? 0, 'valor_realizado' => 0],
        );

        $lancamentos = $meta->lancamentos()
            ->whereYear('data_evento', $ano)
            ->whereMonth('data_evento', $mes);

        if ($meta->isComissao()) {
            $comissao = app(ComissaoService::class);
            $niveis = $comissao->niveisValidos($meta->niveis_comissao ?? []);
            $competencia->valor_realizado = $this->ultimosPorGrao($meta, $ano, $mes)->sum(
                fn (MetaLancamento $l) => $comissao->calcular(
                    $niveis,
                    (float) $l->valor_realizado,
                    (float) ($l->valor_adesao ?? 0),
                )['total']
            );
        } elseif ($meta->isComparativa()) {
            $valores = $this->ultimosPorGrao($meta, $ano, $mes)->pluck('valor_realizado');
            $competencia->valor_realizado = $valores->isEmpty()
                ? 0
                : ($meta->agregacao === 'soma' ? $valores->sum() : $valores->avg());
        } else {
            $ultimo = (clone $lancamentos)->orderByDesc('data_evento')->orderByDesc('id')->first();
            $competencia->valor_realizado = $ultimo?->valor_realizado ?? 0;
        }

        $competencia->save();
    }

    public function ultimosPorGrao(Meta $meta, ?int $ano = null, ?int $mes = null)
    {
        $query = $meta->lancamentos()->orderByDesc('data_evento')->orderByDesc('id');
        if ($ano && $mes) {
            $query->whereYear('data_evento', $ano)->whereMonth('data_evento', $mes);
        }

        return $query->get()
            ->unique(fn (MetaLancamento $l) => implode('-', [
                $l->departamento_id,
                $l->cargo_id,
                $l->usuario_alvo_id,
            ]))
            ->values();
    }

    private function ultimoAlvo(Meta $meta): ?float
    {
        $anterior = $meta->competencias()->orderByDesc('ano')->orderByDesc('mes')->first();

        return $anterior ? (float) $anterior->valor_meta : null;
    }

    private function normalizarAlvo(User $user, Meta $meta, array $dados): array
    {
        if (! $meta->isPorGrao()) {
            return [
                'departamento_id' => null,
                'cargo_id' => null,
                'usuario_alvo_id' => null,
            ];
        }

        $alvo = [
            'departamento_id' => $dados['departamento_id'] ?? null,
            'cargo_id' => $dados['cargo_id'] ?? null,
            'usuario_alvo_id' => $dados['usuario_alvo_id'] ?? null,
        ];

        if ($meta->isComissao()) {
            if (! $user->is_direcao && ! $user->isLider()) {
                $pedido = (int) ($alvo['usuario_alvo_id'] ?? $user->id);
                if ($pedido !== 0 && $pedido !== (int) $user->id) {
                    abort(403);
                }
                $alvo['usuario_alvo_id'] = $user->id;
                $alvo['departamento_id'] = $user->departamento_id;
                $alvo['cargo_id'] = $user->cargo_id;
            }

            return $alvo;
        }

        if (! $user->is_direcao && $user->isLider() && in_array($meta->tipo_escopo, ['global', 'departamento'], true)) {
            $alvo['departamento_id'] = $user->departamento_id;
            $alvo['cargo_id'] = null;
            $alvo['usuario_alvo_id'] = null;
        }

        if (! $user->is_direcao && ! $user->isLider() && $meta->tipo_escopo === 'individual') {
            $alvo['usuario_alvo_id'] = $user->id;
            $alvo['departamento_id'] = $user->departamento_id;
            $alvo['cargo_id'] = null;
        }

        return $alvo;
    }
}
