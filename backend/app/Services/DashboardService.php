<?php

namespace App\Services;

use App\Models\Departamento;
use App\Models\Meta;
use App\Models\MetaCompetencia;
use App\Models\MetaLancamento;
use App\Models\User;
use App\Support\IndicadorStatus;
use Illuminate\Support\Collection;

class DashboardService
{
    public function __construct(
        private AcessoMetas $acesso,
        private ProgressoService $progresso,
        private CompetenciaService $competencias,
    ) {}

    public function montar(User $user, int $ano, int $mes, string $visao = 'global', ?int $departamentoId = null): array
    {
        $visao = $this->resolverVisao($user, $visao);

        $query = Meta::query()
            ->with(['departamentos', 'cargos.departamento', 'usuarios.cargo'])
            ->competencia($ano, $mes)
            ->visibleTo($user)
            ->orderBy('titulo');

        if ($visao === 'setor') {
            $departamentoId = $user->is_direcao ? $departamentoId : $user->departamento_id;
            if ($departamentoId) {
                $query->doSetor($departamentoId);
            }
        }

        if ($visao === 'me') {
            $query->where(function ($q) use ($user) {
                $q->where('tipo_escopo', 'global')
                    ->orWhereHas('usuarios', fn ($inner) => $inner->where('users.id', $user->id))
                    ->orWhereHas('cargos', fn ($inner) => $inner->where('cargos.id', $user->cargo_id))
                    ->orWhereHas('departamentos', fn ($inner) => $inner->where('departamentos.id', $user->departamento_id));
            });
        }

        $metas = $query->get()->map(function (Meta $meta) use ($user, $ano, $mes) {
            $this->competencias->hidratar($meta, $ano, $mes);

            return $this->serializarMeta($user, $meta, $ano, $mes);
        });

        $grupos = $this->grupos($metas);

        return [
            'kpis' => array_merge($this->kpis($metas), [
                'setores' => collect($grupos)->where('tipo', 'departamento')->count(),
                'pessoas' => collect($grupos)->sum(fn (array $g) => count($g['pessoas'])),
            ]),
            'metas' => $metas->values(),
            'grupos' => $grupos,
            'visao' => $visao,
            'ano' => $ano,
            'mes' => $mes,
        ];
    }

    public function serializarMeta(User $user, Meta $meta, int $ano, int $mes): array
    {
        $percentual = $meta->percentual();
        $status = $meta->status();
        $podeLancar = $this->acesso->podeLancarAlgumGrao($user, $meta);

        $payload = [
            'id' => $meta->id,
            'titulo' => $meta->titulo,
            'descricao' => $meta->descricao,
            'subtitulo' => $meta->subtitulo(),
            'tipo_escopo' => $meta->tipo_escopo,
            'valor_meta' => (float) $meta->getAttribute('valor_meta'),
            'valor_realizado' => (float) $meta->getAttribute('valor_realizado'),
            'unidade' => $meta->unidade,
            'sentido' => $meta->sentido,
            'percentual' => $percentual,
            'status' => $status,
            'pode_lancar' => $podeLancar,
            'somente_leitura' => ! $podeLancar,
            'chart' => [
                'tipo' => $meta->chart_tipo,
                'cor' => $meta->chart_cor,
            ],
            'departamentos' => $meta->departamentos->map(fn ($d) => [
                'id' => $d->id,
                'nome' => $d->nome,
            ])->values()->all(),
            'cargos' => $meta->cargos->map(fn ($c) => [
                'id' => $c->id,
                'nome' => $c->nome,
                'departamento_id' => $c->departamento_id,
            ])->values()->all(),
            'usuarios' => $meta->usuarios->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'cargo' => $u->cargo?->nome,
                'departamento_id' => $u->departamento_id,
            ])->values()->all(),
        ];

        if ($meta->chart_tipo === 'line') {
            $payload['historico'] = $meta->competencias()
                ->where('ano', $ano)
                ->orderBy('mes')
                ->get()
                ->map(fn (MetaCompetencia $c) => [
                    'em' => sprintf('%04d-%02d-01', $c->ano, $c->mes),
                    'valor' => (float) $c->valor_realizado,
                ]);
        }

        if ($meta->chart_tipo === 'column') {
            $payload['series'] = $this->series($user, $meta, $ano, $mes);
        }

        return $payload;
    }

    private function series(User $user, Meta $meta, int $ano, int $mes): Collection
    {
        $ultimos = $this->progresso->ultimosPorGrao($meta, $ano, $mes);
        $graos = $meta->isComparativa() && $user->isLider()
            ? $this->acesso->graosLancaveis($user, $meta)
            : $this->acesso->graosDaMeta($meta);
        $alvo = (float) $meta->getAttribute('valor_meta');

        return $graos->map(function (array $grao) use ($ultimos, $meta, $alvo) {
            $ultimo = $ultimos->first(function (MetaLancamento $l) use ($grao) {
                return (int) $l->departamento_id === (int) ($grao['departamento_id'] ?? 0)
                    && (int) $l->cargo_id === (int) ($grao['cargo_id'] ?? 0)
                    && (int) $l->usuario_alvo_id === (int) ($grao['usuario_alvo_id'] ?? 0);
            });

            $valor = (float) ($ultimo?->valor_realizado ?? 0);
            $percentual = IndicadorStatus::percentual($valor, $alvo, $meta->sentido);

            return [
                'label' => $grao['label'],
                'departamento_id' => $grao['departamento_id'],
                'cargo_id' => $grao['cargo_id'] ?? null,
                'usuario_alvo_id' => $grao['usuario_alvo_id'] ?? null,
                'valor' => $valor,
                'percentual' => $percentual,
            ];
        })->values();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $metas
     * @return list<array<string, mixed>>
     */
    private function grupos(Collection $metas): array
    {
        $saida = [];
        $globais = $this->ordenarMetas($metas->filter(fn (array $m) => $m['tipo_escopo'] === 'global')->values());
        if ($globais->isNotEmpty()) {
            $saida[] = $this->montarGrupo(
                'global',
                null,
                'Empresa',
                'Indicadores de toda a empresa',
                $globais,
                [],
            );
        }

        $departamentos = Departamento::query()->where('ativo', true)->orderBy('nome')->get();
        foreach ($departamentos as $dept) {
            $setor = $this->ordenarMetas($metas->filter(fn (array $m) => in_array($m['tipo_escopo'], ['departamento', 'cargo'], true)
                && $this->metaNoDepartamento($m, $dept->id))->values());
            $individuais = $metas->filter(fn (array $m) => $m['tipo_escopo'] === 'individual'
                && $this->metaNoDepartamento($m, $dept->id))->values();
            $pessoas = $this->pessoasDoDepartamento($individuais, $dept->id);

            if ($setor->isEmpty() && $pessoas === []) {
                continue;
            }

            $saida[] = $this->montarGrupo(
                'departamento',
                $dept->id,
                $dept->nome,
                'Metas do setor e das pessoas',
                $setor,
                $pessoas,
            );
        }

        return $saida;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $metasSetor
     * @param  list<array<string, mixed>>  $pessoas
     * @return array<string, mixed>
     */
    private function montarGrupo(string $tipo, ?int $id, string $nome, string $subtitulo, Collection $metasSetor, array $pessoas): array
    {
        $todas = $metasSetor
            ->concat(collect($pessoas)->flatMap(fn (array $p) => $p['metas']))
            ->unique('id')
            ->values();

        return [
            'tipo' => $tipo,
            'id' => $id,
            'nome' => $nome,
            'subtitulo' => $subtitulo,
            'kpis' => $this->kpis($todas),
            'metas_setor' => $metasSetor->values()->all(),
            'pessoas' => $pessoas,
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $individuais
     * @return list<array<string, mixed>>
     */
    private function pessoasDoDepartamento(Collection $individuais, int $deptId): array
    {
        $porUsuario = [];
        foreach ($individuais as $meta) {
            foreach ($meta['usuarios'] ?? [] as $usuario) {
                if ((int) ($usuario['departamento_id'] ?? 0) !== $deptId) {
                    continue;
                }
                $id = (int) $usuario['id'];
                if (! isset($porUsuario[$id])) {
                    $porUsuario[$id] = [
                        'id' => $id,
                        'nome' => $usuario['name'],
                        'cargo' => $usuario['cargo'] ?? null,
                        'metas' => collect(),
                    ];
                }
                $porUsuario[$id]['metas']->push($meta);
            }
        }

        return collect($porUsuario)
            ->sortBy('nome', SORT_NATURAL | SORT_FLAG_CASE)
            ->map(fn (array $pessoa) => [
                'id' => $pessoa['id'],
                'nome' => $pessoa['nome'],
                'cargo' => $pessoa['cargo'],
                'kpis' => $this->kpis($pessoa['metas']),
                'metas' => $this->ordenarMetas($pessoa['metas'])->all(),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $metas
     * @return Collection<int, array<string, mixed>>
     */
    private function ordenarMetas(Collection $metas): Collection
    {
        return $metas->sortBy(function (array $meta) {
            $tipo = match ($meta['tipo_escopo']) {
                'global' => 0,
                'departamento' => 1,
                'cargo' => 2,
                default => 3,
            };

            return sprintf('%d-%s', $tipo, mb_strtolower($meta['titulo']));
        })->values();
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function metaNoDepartamento(array $meta, int $deptId): bool
    {
        return match ($meta['tipo_escopo']) {
            'departamento' => collect($meta['departamentos'] ?? [])->contains('id', $deptId),
            'cargo' => collect($meta['cargos'] ?? [])->contains('departamento_id', $deptId),
            'individual' => collect($meta['usuarios'] ?? [])->contains('departamento_id', $deptId),
            default => false,
        };
    }

    private function kpis(Collection $metas): array
    {
        $total = $metas->count();
        $concluidas = $metas->where('status', 'concluida')->count();
        $desempenho = $total === 0 ? 0.0 : round(($concluidas / $total) * 100, 1);

        return [
            'total_ativas' => $total,
            'concluidas' => $concluidas,
            'desempenho_medio' => $desempenho,
        ];
    }

    private function resolverVisao(User $user, string $visao): string
    {
        if ($user->perfil() === 'colaborador') {
            return 'me';
        }

        if ($user->perfil() === 'lider' && $visao === 'global') {
            return 'setor';
        }

        if (! in_array($visao, ['global', 'setor', 'me'], true)) {
            return 'global';
        }

        return $visao;
    }
}
