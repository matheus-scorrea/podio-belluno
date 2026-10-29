<?php

namespace App\Services;

use App\Models\Meta;
use App\Models\MetaCompetencia;
use App\Models\MetaLancamento;
use App\Models\User;
use App\Models\UsuarioCompetencia;
use App\Support\AssinaturaEscopo;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

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

    /**
     * @return array{0: int, 1: int}
     */
    public function proximo(int $ano, int $mes): array
    {
        if ($mes === 12) {
            return [$ano + 1, 1];
        }

        return [$ano, $mes + 1];
    }

    /**
     * @return list<array{0: int, 1: int}>
     */
    public function destinosClonePermitidos(?Carbon $agora = null): array
    {
        $agora ??= now();
        $atual = [(int) $agora->year, (int) $agora->month];

        return [$atual, $this->proximo($atual[0], $atual[1])];
    }

    public function destinoClonePermitido(int $ano, int $mes, ?Carbon $agora = null): bool
    {
        foreach ($this->destinosClonePermitidos($agora) as [$permitidoAno, $permitidoMes]) {
            if ($permitidoAno === $ano && $permitidoMes === $mes) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array{tipo_escopo?: string, usuario_ids?: list<int>, cargo_ids?: list<int>, departamento_ids?: list<int>}|null  $escopo
     * @return array{competencia: MetaCompetencia, meta: Meta, duplicada: bool}
     */
    public function clonar(
        Meta $meta,
        int $ano,
        int $mes,
        ?int $origemAno = null,
        ?int $origemMes = null,
        ?array $escopo = null,
        ?int $createdBy = null,
    ): array {
        if (! $this->destinoClonePermitido($ano, $mes)) {
            throw ValidationException::withMessages([
                'mes' => 'Só é possível clonar para o mês atual ou o próximo.',
            ]);
        }

        $origem = $this->origemDaMeta($meta, $origemAno, $origemMes);
        if (! $origem) {
            throw ValidationException::withMessages([
                'origem_mes' => 'Não há competência de origem para clonar.',
            ]);
        }

        $jaExiste = MetaCompetencia::query()
            ->where('meta_id', $meta->id)
            ->where('ano', $ano)
            ->where('mes', $mes)
            ->exists();

        $realizadoInicial = $meta->isMarco() ? (float) $origem->valor_realizado : 0;

        if (! $jaExiste) {
            return [
                'competencia' => $this->criarCompetenciaClonada($meta, $origem, $ano, $mes, $realizadoInicial),
                'meta' => $meta,
                'duplicada' => false,
            ];
        }

        $tipo = $escopo['tipo_escopo'] ?? null;
        if (! is_string($tipo) || $tipo === '') {
            throw ValidationException::withMessages([
                'escopo' => 'Esta meta já está aberta neste mês para esta equipe. Recadastre o escopo para clonar.',
            ]);
        }

        $usuarioIds = array_map('intval', $escopo['usuario_ids'] ?? []);
        $cargoIds = array_map('intval', $escopo['cargo_ids'] ?? []);
        $departamentoIds = array_map('intval', $escopo['departamento_ids'] ?? []);

        if ($meta->isComissao() && ! in_array($tipo, ['individual', 'cargo'], true)) {
            throw ValidationException::withMessages([
                'escopo' => 'Comissão de vendedor se aplica a pessoas ou cargos.',
            ]);
        }

        $ids = match ($tipo) {
            'individual' => $usuarioIds,
            'cargo' => $cargoIds,
            'departamento' => $departamentoIds,
            default => [],
        };

        if ($tipo !== 'global' && $ids === []) {
            throw ValidationException::withMessages([
                'escopo' => 'Escolha as pessoas, cargos ou setores da nova equipe.',
            ]);
        }

        $assinatura = AssinaturaEscopo::de($tipo, $ids);
        foreach ($this->familiaNoMes($meta, $ano, $mes) as $irmã) {
            if (AssinaturaEscopo::daMeta($irmã) === $assinatura) {
                throw ValidationException::withMessages([
                    'escopo' => 'Já existe esta meta neste mês para a mesma equipe. Recadastre o escopo.',
                ]);
            }
        }

        $copia = $meta->replicate();
        $copia->cloned_from_id = $meta->cloned_from_id ?? $meta->id;
        $copia->tipo_escopo = $tipo;
        $copia->created_by = $createdBy ?? $meta->created_by;
        $copia->save();

        $copia->usuarios()->sync($tipo === 'individual' ? $usuarioIds : []);
        $copia->cargos()->sync($tipo === 'cargo' ? $cargoIds : []);
        $copia->departamentos()->sync($tipo === 'departamento' ? $departamentoIds : []);

        return [
            'competencia' => $this->criarCompetenciaClonada($copia, $origem, $ano, $mes, $realizadoInicial),
            'meta' => $copia->fresh(),
            'duplicada' => true,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection<int, Meta>
     */
    private function familiaNoMes(Meta $meta, int $ano, int $mes)
    {
        $raiz = $meta->cloned_from_id ?? $meta->id;

        return Meta::query()
            ->where(function ($q) use ($raiz) {
                $q->where('id', $raiz)->orWhere('cloned_from_id', $raiz);
            })
            ->whereHas('competencias', fn ($q) => $q->where('ano', $ano)->where('mes', $mes))
            ->with(['usuarios', 'cargos', 'departamentos'])
            ->get();
    }

    private function criarCompetenciaClonada(Meta $meta, MetaCompetencia $origem, int $ano, int $mes, float $realizadoInicial): MetaCompetencia
    {
        $valores = [
            'meta_id' => $meta->id,
            'ano' => $ano,
            'mes' => $mes,
            'valor_meta' => $origem->valor_meta,
            'valor_realizado' => $realizadoInicial,
        ];
        if ($meta->isComissao()) {
            $valores['niveis_comissao'] = $origem->niveis_comissao ?? $meta->niveis_comissao;
        }

        return MetaCompetencia::query()->create($valores);
    }

    private function origemDaMeta(Meta $meta, ?int $origemAno, ?int $origemMes): ?MetaCompetencia
    {
        if ($origemAno && $origemMes) {
            return $meta->competencias()
                ->where('ano', $origemAno)
                ->where('mes', $origemMes)
                ->first();
        }

        return $meta->competencias()->orderByDesc('ano')->orderByDesc('mes')->first();
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
                if ($comp->meta?->isMarcoPorPessoa()) {
                    $this->replicarMarcosPorPessoa($comp->meta, $origemAno, $origemMes, $ano, $mes);
                    app(ProgressoService::class)->refreshAgregado($comp->meta, $ano, $mes);
                }
            }
        }

        $this->retratarUsuarios($ano, $mes);

        return $criadas;
    }

    public function retratarUsuarios(int $ano, int $mes): void
    {
        User::query()->where('ativo', true)->each(function (User $user) use ($ano, $mes) {
            UsuarioCompetencia::query()->firstOrCreate(
                ['user_id' => $user->id, 'ano' => $ano, 'mes' => $mes],
                [
                    'departamento_id' => $user->departamento_id,
                    'cargo_id' => $user->cargo_id,
                ],
            );
        });
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

    private function replicarMarcosPorPessoa(Meta $meta, int $origemAno, int $origemMes, int $ano, int $mes): void
    {
        $progresso = app(ProgressoService::class);
        $origem = $progresso->ultimosPorGrao($meta, $origemAno, $origemMes);
        $data = sprintf('%04d-%02d-01', $ano, $mes);

        foreach ($origem as $lancamento) {
            MetaLancamento::query()->create([
                'meta_id' => $meta->id,
                'data_evento' => $data,
                'valor_realizado' => (float) $lancamento->valor_realizado >= 1 ? 1 : 0,
                'observacao' => $lancamento->observacao,
                'departamento_id' => $lancamento->departamento_id,
                'cargo_id' => $lancamento->cargo_id,
                'usuario_alvo_id' => $lancamento->usuario_alvo_id,
                'lancado_por' => $lancamento->lancado_por,
            ]);
        }
    }
}
