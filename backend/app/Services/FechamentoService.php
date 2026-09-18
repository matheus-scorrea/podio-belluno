<?php

namespace App\Services;

use App\Models\Meta;
use App\Models\MetaLancamento;
use App\Models\User;
use App\Support\IndicadorStatus;
use Illuminate\Support\Collection;

class FechamentoService
{
    public function __construct(
        private AcessoMetas $acesso,
        private ProgressoService $progresso,
        private CompetenciaService $competencias,
        private ComissaoService $comissao,
    ) {}

    public function montar(User $user, int $ano, int $mes, ?int $departamentoId = null): array
    {
        $metas = Meta::query()
            ->with(['departamentos', 'cargos', 'usuarios'])
            ->competencia($ano, $mes)
            ->visibleTo($user)
            ->orderBy('titulo')
            ->get();

        $ativos = User::query()
            ->where('ativo', true)
            ->with(['departamento', 'cargo'])
            ->get()
            ->keyBy('id');

        /** @var array<int, array{usuario: User, itens: list<array<string, mixed>>}> $porUsuario */
        $porUsuario = [];

        foreach ($metas as $meta) {
            $this->competencias->hidratar($meta, $ano, $mes);

            if ($meta->isComissao()) {
                $this->acumularComissao($meta, $ativos, $porUsuario, $ano, $mes);

                continue;
            }

            if ($meta->isPorPessoa()) {
                $this->acumularPorPessoa($meta, $ativos, $porUsuario, $ano, $mes);

                continue;
            }

            $series = $meta->isComparativa() ? $this->series($meta, $ano, $mes) : collect();
            $bonus = round((float) $meta->valor_bonus, 2);

            foreach ($this->beneficiarios($meta, $ativos) as $beneficiario) {
                $percentual = $this->percentualDoUsuario($beneficiario, $meta, $series);
                if ($percentual < 100) {
                    continue;
                }

                $porUsuario[$beneficiario->id] ??= ['usuario' => $beneficiario, 'itens' => []];
                $porUsuario[$beneficiario->id]['itens'][] = [
                    'meta_id' => $meta->id,
                    'titulo' => $meta->titulo,
                    'tipo_escopo' => $meta->tipo_escopo,
                    'percentual' => $percentual,
                    'valor_bonus' => $bonus,
                ];
            }
        }

        $usuarios = collect($porUsuario)
            ->map(function (array $row) {
                $pessoa = $row['usuario'];
                $itens = collect($row['itens'])->sortBy('titulo', SORT_NATURAL | SORT_FLAG_CASE)->values()->all();

                return [
                    'id' => $pessoa->id,
                    'name' => $pessoa->name,
                    'departamento' => $pessoa->departamento?->nome,
                    'departamento_id' => $pessoa->departamento_id,
                    'cargo' => $pessoa->cargo?->nome,
                    'bonus_total' => round((float) collect($itens)->sum('valor_bonus'), 2),
                    'itens' => $itens,
                ];
            });

        $usuarios = match ($user->perfil()) {
            'direcao' => $departamentoId
                ? $usuarios->where('departamento_id', $departamentoId)
                : $usuarios,
            'lider' => $usuarios->where('departamento_id', $user->departamento_id),
            default => $usuarios->where('id', $user->id),
        };

        $usuarios = $usuarios
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        return [
            'ano' => $ano,
            'mes' => $mes,
            'pessoas' => $usuarios->count(),
            'metas_batidas' => $usuarios
                ->flatMap(fn (array $pessoa) => collect($pessoa['itens'])->pluck('meta_id'))
                ->unique()
                ->count(),
            'total_bonus' => round((float) $usuarios->sum('bonus_total'), 2),
            'usuarios' => $usuarios->all(),
        ];
    }

    /**
     * @param  Collection<int, User>  $ativos
     * @param  array<int, array{usuario: User, itens: list<array<string, mixed>>}>  $porUsuario
     */
    private function acumularComissao(Meta $meta, Collection $ativos, array &$porUsuario, int $ano, int $mes): bool
    {
        $niveis = $this->comissao->niveisValidos($meta->niveis_comissao ?? []);
        $ultimos = $this->progresso->ultimosPorGrao($meta, $ano, $mes);
        $pagouAlguem = false;

        foreach ($this->beneficiarios($meta, $ativos) as $user) {
            $lancamento = $ultimos->first(
                fn (MetaLancamento $l) => (int) $l->usuario_alvo_id === (int) $user->id
            );
            $calc = $this->comissao->calcular(
                $niveis,
                (float) ($lancamento?->valor_realizado ?? 0),
                (float) ($lancamento?->valor_adesao ?? 0),
            );

            if ($calc['total'] <= 0) {
                continue;
            }

            $pagouAlguem = true;
            $porUsuario[$user->id] ??= ['usuario' => $user, 'itens' => []];
            $porUsuario[$user->id]['itens'][] = [
                'meta_id' => $meta->id,
                'titulo' => $meta->titulo,
                'tipo_escopo' => $meta->tipo_escopo,
                'percentual' => 100.0,
                'valor_bonus' => round((float) $calc['total'], 2),
                'nivel' => $calc['nivel'],
            ];
        }

        return $pagouAlguem;
    }

    /**
     * @param  Collection<int, User>  $ativos
     * @param  array<int, array{usuario: User, itens: list<array<string, mixed>>}>  $porUsuario
     */
    private function acumularPorPessoa(Meta $meta, Collection $ativos, array &$porUsuario, int $ano, int $mes): bool
    {
        $ultimos = $this->progresso->ultimosPorGrao($meta, $ano, $mes);
        $bonus = round((float) $meta->valor_bonus, 2);
        $alvo = (float) $meta->getAttribute('valor_meta');
        $pagouAlguem = false;

        foreach ($this->beneficiarios($meta, $ativos) as $user) {
            $lancamento = $ultimos->first(
                fn (MetaLancamento $l) => (int) $l->usuario_alvo_id === (int) $user->id
            );
            $valor = (float) ($lancamento?->valor_realizado ?? 0);
            $percentual = $meta->isMarco()
                ? ($valor >= 1 ? 100.0 : 0.0)
                : IndicadorStatus::percentual($valor, $alvo, $meta->sentido);

            if ($percentual < 100) {
                continue;
            }

            $pagouAlguem = true;
            $porUsuario[$user->id] ??= ['usuario' => $user, 'itens' => []];
            $porUsuario[$user->id]['itens'][] = [
                'meta_id' => $meta->id,
                'titulo' => $meta->titulo,
                'tipo_escopo' => $meta->tipo_escopo,
                'percentual' => $percentual,
                'valor_bonus' => $bonus,
            ];
        }

        return $pagouAlguem;
    }

    /**
     * @param  Collection<int, User>  $ativos
     * @return Collection<int, User>
     */
    private function beneficiarios(Meta $meta, Collection $ativos): Collection
    {
        return match ($meta->tipo_escopo) {
            'individual' => $ativos->filter(fn (User $u) => $meta->usuarios->contains('id', $u->id))->values(),
            'cargo' => $ativos->filter(fn (User $u) => $meta->cargos->contains('id', $u->cargo_id))->values(),
            'departamento' => $ativos->filter(fn (User $u) => $meta->departamentos->contains('id', $u->departamento_id))->values(),
            'global' => $ativos->filter(fn (User $u) => ! $u->is_direcao)->values(),
            default => collect(),
        };
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $series
     */
    private function percentualDoUsuario(User $user, Meta $meta, Collection $series): float
    {
        if (! $meta->isComparativa()) {
            return $meta->percentual();
        }

        $grao = $series->first(function (array $s) use ($user, $meta) {
            return match ($meta->tipo_escopo) {
                'individual' => (int) ($s['usuario_alvo_id'] ?? 0) === (int) $user->id,
                'cargo' => (int) ($s['cargo_id'] ?? 0) === (int) $user->cargo_id,
                'departamento', 'global' => (int) ($s['departamento_id'] ?? 0) === (int) $user->departamento_id,
                default => false,
            };
        });

        return (float) ($grao['percentual'] ?? 0);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function series(Meta $meta, int $ano, int $mes): Collection
    {
        $ultimos = $this->progresso->ultimosPorGrao($meta, $ano, $mes);
        $graos = $this->acesso->graosDaMeta($meta);
        $alvo = (float) $meta->getAttribute('valor_meta');

        return $graos->map(function (array $grao) use ($ultimos, $meta, $alvo) {
            $ultimo = $ultimos->first(function (MetaLancamento $l) use ($grao) {
                return (int) $l->departamento_id === (int) ($grao['departamento_id'] ?? 0)
                    && (int) $l->cargo_id === (int) ($grao['cargo_id'] ?? 0)
                    && (int) $l->usuario_alvo_id === (int) ($grao['usuario_alvo_id'] ?? 0);
            });

            $valor = (float) ($ultimo?->valor_realizado ?? 0);

            return [
                'departamento_id' => $grao['departamento_id'] ?? null,
                'cargo_id' => $grao['cargo_id'] ?? null,
                'usuario_alvo_id' => $grao['usuario_alvo_id'] ?? null,
                'percentual' => IndicadorStatus::percentual($valor, $alvo, $meta->sentido),
            ];
        })->values();
    }
}
