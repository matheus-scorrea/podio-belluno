<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLancamentoRequest;
use App\Models\Meta;
use App\Models\MetaCompetencia;
use App\Services\AcessoMetas;
use App\Services\CompetenciaService;
use App\Services\ProgressoService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class LancamentoController extends Controller
{
    public function __construct(
        private ProgressoService $progresso,
        private AcessoMetas $acesso,
        private CompetenciaService $competencias,
    ) {}

    public function lancaveis(Request $request)
    {
        $ano = (int) $request->query('ano', now()->year);
        $mes = (int) $request->query('mes', now()->month);
        $user = $request->user();

        $metas = Meta::query()
            ->with(['departamentos', 'cargos', 'usuarios'])
            ->competencia($ano, $mes)
            ->get()
            ->filter(fn (Meta $meta) => $this->acesso->podeLancarAlgumGrao($user, $meta))
            ->values()
            ->map(function (Meta $meta) use ($ano, $mes, $user) {
                $this->competencias->hidratar($meta, $ano, $mes);

                return [
                    'id' => $meta->id,
                    'titulo' => $meta->titulo,
                    'subtitulo' => $meta->subtitulo(),
                    'unidade' => $meta->unidade,
                    'valor_meta' => (float) $meta->getAttribute('valor_meta'),
                    'valor_realizado' => (float) $meta->getAttribute('valor_realizado'),
                    'comparativa' => $meta->isComparativa(),
                    'por_grao' => $meta->isPorGrao(),
                    'chart_tipo' => $meta->chart_tipo,
                    'tipo_escopo' => $meta->tipo_escopo,
                    'graos' => $this->acesso->graosLancaveis($user, $meta),
                ];
            });

        return ['data' => $metas];
    }

    public function index(Request $request, Meta $meta)
    {
        $this->authorize('view', $meta);

        return $meta->lancamentos()->with(['autor', 'departamento', 'cargo', 'usuarioAlvo'])
            ->orderBy('data_evento')
            ->get();
    }

    public function store(StoreLancamentoRequest $request, Meta $meta)
    {
        $this->authorize('lancarProgresso', $meta);

        $data = $request->validated();
        $evento = Carbon::parse($data['data_evento']);

        $aberta = MetaCompetencia::query()
            ->where('meta_id', $meta->id)
            ->where('ano', $evento->year)
            ->where('mes', $evento->month)
            ->exists();

        if (! $aberta) {
            throw ValidationException::withMessages([
                'data_evento' => 'Não há alvo aberto para esta competência. Peça à Direção para replicar o mês.',
            ]);
        }

        $lancamento = $this->progresso->lancar($request->user(), $meta, $data);

        return response()->json($lancamento->load(['autor', 'departamento']), 201);
    }
}
