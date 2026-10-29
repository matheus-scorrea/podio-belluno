<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDwConexaoRequest;
use App\Models\DwConexao;
use App\Services\DwIndicadorService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Throwable;

class DwConexaoController extends Controller
{
    public function __construct(private DwIndicadorService $dw) {}

    public function index()
    {
        return [
            'data' => DwConexao::query()->withCount('variaveis')->orderBy('nome')->get()->map(
                fn (DwConexao $conexao) => $this->serializar($conexao)
            ),
        ];
    }

    public function store(StoreDwConexaoRequest $request)
    {
        $conexao = DwConexao::query()->create($request->validated());

        return response()->json($this->serializar($conexao->refresh()), 201);
    }

    public function show(DwConexao $conexao)
    {
        return $this->serializar($conexao);
    }

    public function update(StoreDwConexaoRequest $request, DwConexao $conexao)
    {
        $data = $request->validated();
        if (! filled($data['senha'] ?? null)) {
            unset($data['senha']);
        }
        $conexao->update($data);

        return $this->serializar($conexao->fresh());
    }

    public function destroy(DwConexao $conexao)
    {
        if ($conexao->variaveis()->exists()) {
            throw ValidationException::withMessages([
                'conexao' => 'Esta conexão está em uso por uma variável. Remova o vínculo antes de excluir.',
            ]);
        }

        $conexao->delete();

        return response()->noContent();
    }

    public function testarRascunho(Request $request)
    {
        $data = $request->validate([
            'driver' => ['required', 'in:mysql'],
            'host' => ['required', 'string'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'database' => ['required', 'string'],
            'username' => ['required', 'string'],
            'senha' => ['required', 'string'],
            'ssl' => ['sometimes', 'boolean'],
        ]);
        $alvo = new DwConexao($data);

        return $this->executarTesteConexao($alvo);
    }

    public function testar(DwConexao $conexao, Request $request)
    {
        if ($request->filled('senha') || $request->filled('host')) {
            $conexao->fill($request->only(['host', 'port', 'database', 'username', 'ssl', 'driver']));
            if ($request->filled('senha')) {
                $conexao->senha = $request->string('senha')->toString();
            }
        }

        return $this->executarTesteConexao($conexao);
    }

    /**
     * @return array{ok: true}
     */
    private function executarTesteConexao(DwConexao $alvo): array
    {
        try {
            $this->dw->testarConexao($alvo);
        } catch (Throwable $e) {
            throw ValidationException::withMessages([
                'conexao' => $this->dw->mensagemPublica($e),
            ]);
        }

        return ['ok' => true];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializar(DwConexao $conexao): array
    {
        $conexao->loadCount('variaveis');

        return [
            'id' => $conexao->id,
            'nome' => $conexao->nome,
            'driver' => $conexao->driver,
            'host' => $conexao->host,
            'port' => $conexao->port,
            'database' => $conexao->database,
            'username' => $conexao->username,
            'ssl' => $conexao->ssl,
            'ativa' => $conexao->ativa,
            'tem_senha' => filled($conexao->getAttributes()['senha'] ?? null),
            'variaveis_count' => (int) $conexao->variaveis_count,
        ];
    }
}
