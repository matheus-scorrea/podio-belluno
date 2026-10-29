<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMetaRequest;
use App\Models\Meta;
use App\Models\User;
use App\Services\ComissaoService;
use App\Services\CompetenciaService;
use App\Services\ProgressoService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class MetaController extends Controller
{
    public function __construct(
        private CompetenciaService $competencias,
        private ProgressoService $progresso,
    ) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', Meta::class);

        $ano = (int) $request->query('ano', now()->year);
        $mes = (int) $request->query('mes', now()->month);
        $todas = $request->boolean('todas');

        $query = Meta::query()
            ->with(['departamentos', 'cargos', 'usuarios'])
            ->withCount('competencias')
            ->visibleTo($request->user())
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($todas) {
            $query->with('competencias');
        } else {
            $query->competencia($ano, $mes);
        }

        $tipoEscopo = $request->query('tipo_escopo');
        if (is_string($tipoEscopo) && in_array($tipoEscopo, ['individual', 'cargo', 'departamento', 'global'], true)) {
            $query->where('tipo_escopo', $tipoEscopo);
        }

        $departamentoId = $request->integer('departamento_id');
        if ($departamentoId > 0) {
            $query->where(function ($q) use ($departamentoId) {
                $q->where(function ($inner) use ($departamentoId) {
                    $inner->where('tipo_escopo', 'departamento')
                        ->whereHas('departamentos', fn ($d) => $d->where('departamentos.id', $departamentoId));
                })->orWhere(function ($inner) use ($departamentoId) {
                    $inner->where('tipo_escopo', 'cargo')
                        ->whereHas('cargos', fn ($c) => $c->where('departamento_id', $departamentoId));
                })->orWhere(function ($inner) use ($departamentoId) {
                    $inner->where('tipo_escopo', 'individual')
                        ->whereHas('usuarios', fn ($u) => $u->where('departamento_id', $departamentoId));
                });
            });
        }

        $ativos = User::query()
            ->where('ativo', true)
            ->orderBy('name')
            ->get(['id', 'name', 'cargo_id', 'departamento_id']);

        return $query->get()->map(function (Meta $meta) use ($request, $ano, $mes, $ativos) {
            $this->competencias->hidratar($meta, $ano, $mes);
            $this->anexarUsuariosDoEscopo($meta, $ativos);

            return $this->ocultarBonusSeNecessario($request, $meta);
        });
    }

    public function store(StoreMetaRequest $request)
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;
        $data['marco_por_pessoa'] = $request->boolean('marco_por_pessoa');
        $data = $this->normalizarIndicador($data);

        $meta = Meta::query()->create(collect($data)->except(['ano', 'mes', 'valor_meta', 'usuario_ids', 'cargo_ids', 'departamento_ids'])->all());
        $this->syncEscopo($meta, $data);
        $this->competencias->upsert(
            $meta,
            (int) $data['ano'],
            (int) $data['mes'],
            (float) $data['valor_meta'],
            $data['niveis_comissao'] ?? null,
        );

        return response()->json($this->detalhar($meta->refresh(), (int) $data['ano'], (int) $data['mes']), 201);
    }

    public function show(Request $request, Meta $meta)
    {
        $this->authorize('view', $meta);
        $ano = (int) $request->query('ano', now()->year);
        $mes = (int) $request->query('mes', now()->month);

        return $this->ocultarBonusSeNecessario($request, $this->detalhar($meta, $ano, $mes));
    }

    public function update(StoreMetaRequest $request, Meta $meta)
    {
        $data = $request->validated();
        $data['marco_por_pessoa'] = $request->boolean('marco_por_pessoa');
        $data = $this->normalizarIndicador($data);
        $meta->update(collect($data)->except(['ano', 'mes', 'valor_meta', 'usuario_ids', 'cargo_ids', 'departamento_ids'])->all());
        $this->syncEscopo($meta, $data);
        $this->competencias->upsert(
            $meta,
            (int) $data['ano'],
            (int) $data['mes'],
            (float) $data['valor_meta'],
            $data['niveis_comissao'] ?? null,
        );

        if ($meta->isComissao() || $meta->isPorPessoa()) {
            $this->progresso->refreshAgregado($meta->fresh(), (int) $data['ano'], (int) $data['mes']);
        }

        return $this->detalhar($meta->fresh(), (int) $data['ano'], (int) $data['mes']);
    }

    public function destroy(Request $request, Meta $meta)
    {
        $this->authorize('delete', $meta);

        $ano = $request->integer('ano');
        $mes = $request->integer('mes');
        if ($ano < 2020 || $ano > 2100 || $mes < 1 || $mes > 12) {
            abort(422, 'Informe a competência a excluir.');
        }

        $competencia = $meta->competencias()->where('ano', $ano)->where('mes', $mes)->first();
        if ($competencia === null) {
            abort(404);
        }

        $competencia->delete();
        $meta->lancamentos()
            ->whereYear('data_evento', $ano)
            ->whereMonth('data_evento', $mes)
            ->delete();

        $restantes = $meta->competencias()->orderBy('ano')->orderBy('mes')->get(['ano', 'mes'])
            ->map(fn ($c) => ['ano' => $c->ano, 'mes' => $c->mes])
            ->all();
        if ($restantes === []) {
            $meta->delete();
        }

        return response()->noContent();
    }

    public function abrirCompetencia(Request $request)
    {
        $this->authorize('create', Meta::class);

        $data = $request->validate([
            'ano' => ['required', 'integer', 'min:2020', 'max:2100'],
            'mes' => ['required', 'integer', 'min:1', 'max:12'],
            'origem_ano' => ['nullable', 'integer'],
            'origem_mes' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        $criadas = $this->competencias->abrir(
            (int) $data['ano'],
            (int) $data['mes'],
            isset($data['origem_ano']) ? (int) $data['origem_ano'] : null,
            isset($data['origem_mes']) ? (int) $data['origem_mes'] : null,
        );

        return ['criadas' => $criadas];
    }

    public function clonar(Request $request, Meta $meta)
    {
        $this->authorize('create', Meta::class);

        $data = $request->validate([
            'ano' => ['required', 'integer', 'min:2020', 'max:2100'],
            'mes' => ['required', 'integer', 'min:1', 'max:12'],
            'origem_ano' => ['nullable', 'integer'],
            'origem_mes' => ['nullable', 'integer', 'min:1', 'max:12'],
            'tipo_escopo' => ['nullable', 'string', Rule::in(['individual', 'cargo', 'departamento', 'global'])],
            'usuario_ids' => ['nullable', 'array'],
            'usuario_ids.*' => ['integer', 'exists:users,id'],
            'cargo_ids' => ['nullable', 'array'],
            'cargo_ids.*' => ['integer', 'exists:cargos,id'],
            'departamento_ids' => ['nullable', 'array'],
            'departamento_ids.*' => ['integer', 'exists:departamentos,id'],
        ]);

        $escopo = isset($data['tipo_escopo'])
            ? [
                'tipo_escopo' => $data['tipo_escopo'],
                'usuario_ids' => $data['usuario_ids'] ?? [],
                'cargo_ids' => $data['cargo_ids'] ?? [],
                'departamento_ids' => $data['departamento_ids'] ?? [],
            ]
            : null;

        $resultado = $this->competencias->clonar(
            $meta,
            (int) $data['ano'],
            (int) $data['mes'],
            isset($data['origem_ano']) ? (int) $data['origem_ano'] : null,
            isset($data['origem_mes']) ? (int) $data['origem_mes'] : null,
            $escopo,
            $request->user()?->id,
        );

        $competencia = $resultado['competencia'];

        return response()->json([
            'ano' => $competencia->ano,
            'mes' => $competencia->mes,
            'valor_meta' => (float) $competencia->valor_meta,
            'meta_id' => $resultado['meta']->id,
            'duplicada' => $resultado['duplicada'],
        ], 201);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizarIndicador(array $data): array
    {
        $varios = ($data['tipo_escopo'] ?? '') !== 'individual'
            || count($data['usuario_ids'] ?? []) > 1;
        $porPessoa = $varios && filter_var($data['marco_por_pessoa'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if (($data['chart_tipo'] ?? '') === 'marco') {
            $data['unidade'] = 'marco';
            $data['sentido'] = 'maior_melhor';
            $data['agregacao'] = 'ultimo';
            $data['valor_meta'] = 1;
            $data['niveis_comissao'] = null;
            $data['marco_por_pessoa'] = $porPessoa;
            $data = $this->normalizarModoBonus($data, false);
        } elseif (($data['chart_tipo'] ?? '') === 'comissao') {
            $data['unidade'] = 'R$';
            $data['sentido'] = 'maior_melhor';
            $data['agregacao'] = 'soma';
            $data['valor_meta'] = app(ComissaoService::class)->maiorVendaMin($data['niveis_comissao'] ?? []);
            $data['marco_por_pessoa'] = false;
            $data = $this->normalizarModoBonus($data, false);
        } else {
            $data['agregacao'] = $porPessoa || ($data['unidade'] ?? '') === '%' ? 'media' : 'soma';
            $data['niveis_comissao'] = null;
            $data['marco_por_pessoa'] = $porPessoa;
            $data = $this->normalizarModoBonus($data, ($data['sentido'] ?? '') !== 'menor_melhor');
        }

        $aplicaEscada = ($data['chart_tipo'] ?? '') === 'comissao' || ($data['modo_bonus'] ?? '') === 'faixa_unidade';
        $visual = $data['visual_escada'] ?? 'escada';
        $data['visual_escada'] = $aplicaEscada && in_array($visual, Meta::VISUAIS_ESCADA, true) ? $visual : 'escada';

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizarModoBonus(array $data, bool $permiteExtra): array
    {
        $modo = $permiteExtra ? (($data['modo_bonus'] ?? 'fixo') ?: 'fixo') : 'fixo';
        if (! in_array($modo, Meta::MODOS_BONUS, true)) {
            $modo = 'fixo';
        }

        $data['modo_bonus'] = $modo;

        if ($modo === 'linear') {
            $data['bonus_piso_percentual'] = $data['bonus_piso_percentual'] ?? 100;
            $data['bonus_por_unidade_extra'] = null;
            $data['niveis_faixa'] = null;
        } elseif ($modo === 'unidade') {
            $data['bonus_piso_percentual'] = null;
            $data['bonus_teto_percentual'] = null;
            $data['bonus_por_unidade_extra'] = $data['bonus_por_unidade_extra'] ?? 0;
            $data['niveis_faixa'] = null;
        } elseif ($modo === 'por_unidade') {
            $data['bonus_piso_percentual'] = null;
            $data['bonus_teto_percentual'] = null;
            $data['bonus_por_unidade_extra'] = null;
            $data['niveis_faixa'] = null;
        } elseif ($modo === 'faixa_unidade') {
            $data['bonus_piso_percentual'] = null;
            $data['bonus_teto_percentual'] = null;
            $data['bonus_por_unidade_extra'] = null;
            $data['valor_bonus'] = $data['valor_bonus'] ?? 0;
        } else {
            $data['bonus_piso_percentual'] = null;
            $data['bonus_teto_percentual'] = null;
            $data['bonus_por_unidade_extra'] = null;
            $data['niveis_faixa'] = null;
        }

        return $data;
    }

    private function ocultarBonusSeNecessario(Request $request, Meta $meta): Meta
    {
        if (! $request->user()?->is_direcao) {
            $meta->makeHidden([
                'valor_bonus',
                'modo_bonus',
                'bonus_piso_percentual',
                'bonus_teto_percentual',
                'bonus_por_unidade_extra',
                'niveis_faixa',
            ]);
        }

        return $meta;
    }

    private function detalhar(Meta $meta, int $ano, int $mes): Meta
    {
        $meta->load(['departamentos', 'cargos.departamento', 'usuarios', 'competencias', 'lancamentos']);
        $this->competencias->hidratar($meta, $ano, $mes);

        return $meta;
    }

    /**
     * @param  Collection<int, User>  $ativos
     */
    private function anexarUsuariosDoEscopo(Meta $meta, Collection $ativos): void
    {
        $meta->setAttribute(
            'escopo_usuarios',
            $meta->usuariosEnglobados($ativos)
                ->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                ])
                ->values()
                ->all()
        );
    }

    private function syncEscopo(Meta $meta, array $data): void
    {
        $meta->usuarios()->sync($data['tipo_escopo'] === 'individual' ? ($data['usuario_ids'] ?? []) : []);
        $meta->cargos()->sync($data['tipo_escopo'] === 'cargo' ? ($data['cargo_ids'] ?? []) : []);
        $meta->departamentos()->sync($data['tipo_escopo'] === 'departamento' ? ($data['departamento_ids'] ?? []) : []);
    }
}
