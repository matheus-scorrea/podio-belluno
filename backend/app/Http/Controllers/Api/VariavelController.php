<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVariavelRequest;
use App\Models\Variavel;
use App\Services\DwIndicadorService;
use App\Support\DwConsultaSql;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Throwable;

class VariavelController extends Controller
{
    public function __construct(private DwIndicadorService $dw) {}

    public function index(Request $request)
    {
        $status = $request->query('status');
        $query = Variavel::query()->with('conexao')->withCount('metas')->orderBy('nome');

        if ($status === Variavel::PUBLICADA) {
            $query->publicadas();
        }

        $ano = now()->year;
        $mes = now()->month;

        return [
            'data' => $query->get()->map(function (Variavel $variavel) use ($status, $ano, $mes) {
                if ($status === Variavel::PUBLICADA) {
                    return $this->paraSelect($variavel, $ano, $mes);
                }

                return $this->detalhar($variavel, $ano, $mes);
            }),
        ];
    }

    public function store(StoreVariavelRequest $request)
    {
        $data = $request->validated();
        $data['consulta_sql'] = DwConsultaSql::normalizar($data['consulta_sql']);
        $data['status'] = Variavel::RASCUNHO;

        $variavel = Variavel::query()->create($data);

        return response()->json($this->detalhar($variavel->refresh()), 201);
    }

    public function show(Variavel $variavel)
    {
        return $this->detalhar($variavel);
    }

    public function update(StoreVariavelRequest $request, Variavel $variavel)
    {
        $data = $request->validated();
        $data['consulta_sql'] = DwConsultaSql::normalizar($data['consulta_sql']);
        unset($data['chave']);

        $sqlMudou = array_key_exists('consulta_sql', $data) && $data['consulta_sql'] !== $variavel->consulta_sql;
        $conexaoMudou = array_key_exists('conexao_id', $data) && (int) $data['conexao_id'] !== (int) $variavel->conexao_id;
        if (($sqlMudou || $conexaoMudou) && $variavel->status === Variavel::PUBLICADA) {
            $data['status'] = Variavel::RASCUNHO;
        }

        $variavel->update($data);

        return $this->detalhar($variavel->fresh());
    }

    public function destroy(Variavel $variavel)
    {
        if ($variavel->metas()->exists()) {
            throw ValidationException::withMessages([
                'variavel' => 'Esta variável está em uso em uma meta. Inative em vez de excluir.',
            ]);
        }

        $variavel->delete();

        return response()->noContent();
    }

    public function testarConsulta(Request $request)
    {
        $conexaoId = $request->integer('conexao_id');
        $conexao = $conexaoId > 0 ? \App\Models\DwConexao::query()->find($conexaoId) : null;

        return $this->executarTeste($request->input('consulta_sql'), null, $conexao);
    }

    public function testar(Variavel $variavel)
    {
        $variavel->load('conexao');

        return $this->executarTeste($variavel->consulta_sql, $variavel, $variavel->conexao);
    }

    public function publicar(Variavel $variavel)
    {
        $variavel->refresh();
        if (! $variavel->conexao_id) {
            throw ValidationException::withMessages([
                'conexao_id' => 'Selecione a conexão do data warehouse.',
            ]);
        }
        if (! $variavel->consultaTestada()) {
            throw ValidationException::withMessages([
                'consulta_sql' => 'Teste a consulta do mês vigente antes de publicar.',
            ]);
        }

        $variavel->update([
            'status' => Variavel::PUBLICADA,
            'ultimo_erro' => null,
        ]);

        return $this->detalhar($variavel->fresh());
    }

    public function inativar(Variavel $variavel)
    {
        $variavel->update(['status' => Variavel::INATIVA]);

        return $this->detalhar($variavel->fresh());
    }

    public function reativar(Variavel $variavel)
    {
        $variavel->update([
            'status' => $variavel->consultaTestada() ? Variavel::PUBLICADA : Variavel::RASCUNHO,
        ]);

        return $this->detalhar($variavel->fresh());
    }

    public function sincronizar()
    {
        return $this->dw->sincronizarPublicadas();
    }

    /**
     * @return array{valor: float, ano: int, mes: int}
     */
    private function executarTeste(mixed $sql, ?Variavel $variavel = null, ?\App\Models\DwConexao $conexao = null): array
    {
        if (! is_string($sql) || trim($sql) === '') {
            throw ValidationException::withMessages([
                'consulta_sql' => 'Informe a consulta SQL.',
            ]);
        }

        try {
            $resultado = $this->dw->testar($sql, $conexao);
        } catch (InvalidArgumentException $e) {
            if ($variavel) {
                $this->dw->marcarTesteErro($variavel, $e->getMessage());
            }
            throw ValidationException::withMessages(['consulta_sql' => $e->getMessage()]);
        } catch (Throwable $e) {
            $mensagem = trim($e->getMessage()) ?: 'Falha ao consultar o data warehouse.';
            if ($variavel) {
                $this->dw->marcarTesteErro($variavel, $mensagem);
            }
            throw ValidationException::withMessages(['consulta_sql' => $mensagem]);
        }

        if ($variavel) {
            $this->dw->marcarTesteOk($variavel);
        }

        return $resultado;
    }

    /**
     * @return array<string, mixed>
     */
    private function detalhar(Variavel $variavel, ?int $ano = null, ?int $mes = null): array
    {
        $ano ??= now()->year;
        $mes ??= now()->month;
        $variavel->loadCount('metas');
        $variavel->load('conexao');
        $atual = $variavel->valores()->where('ano', $ano)->where('mes', $mes)->first();

        return [
            'id' => $variavel->id,
            'nome' => $variavel->nome,
            'chave' => $variavel->chave,
            'conexao_id' => $variavel->conexao_id,
            'conexao' => $variavel->conexao ? [
                'id' => $variavel->conexao->id,
                'nome' => $variavel->conexao->nome,
                'driver' => $variavel->conexao->driver,
                'host' => $variavel->conexao->host,
                'database' => $variavel->conexao->database,
            ] : null,
            'unidade' => $variavel->unidade,
            'descricao' => $variavel->descricao,
            'consulta_sql' => $variavel->consulta_sql,
            'status' => $variavel->status,
            'ultimo_erro' => $variavel->ultimo_erro,
            'testado_em' => $variavel->testado_em?->toIso8601String(),
            'sincronizado_em' => $variavel->sincronizado_em?->toIso8601String(),
            'consulta_testada' => $variavel->consultaTestada(),
            'valor_vigente' => $atual ? (float) $atual->valor : null,
            'metas_count' => (int) $variavel->metas_count,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function paraSelect(Variavel $variavel, int $ano, int $mes): array
    {
        $atual = $variavel->valores()->where('ano', $ano)->where('mes', $mes)->first();

        return [
            'id' => $variavel->id,
            'nome' => $variavel->nome,
            'chave' => $variavel->chave,
            'unidade' => $variavel->unidade,
            'descricao' => $variavel->descricao,
            'valor_vigente' => $atual ? (float) $atual->valor : null,
        ];
    }
}
