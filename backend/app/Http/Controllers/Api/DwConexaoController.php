<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDwConexaoRequest;
use App\Models\DwConexao;
use App\Services\DwIndicadorService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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
        foreach (DwConexao::SEGREDOS as $segredo) {
            if (! filled($data[$segredo] ?? null)) {
                unset($data[$segredo]);
            }
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
        $data = $request->validate($this->regrasTeste(true));
        $alvo = new DwConexao($data);

        return $this->executarTesteConexao($alvo);
    }

    public function testar(DwConexao $conexao, Request $request)
    {
        if ($request->filled('senha') || $request->filled('host') || $request->filled('acesso')) {
            $conexao->fill($request->only([
                'host', 'port', 'database', 'username', 'ssl', 'driver', 'acesso',
                'ssh_host', 'ssh_port', 'ssh_username', 'ssh_auth',
                'vpn_tipo', 'vpn_servidor', 'vpn_username',
            ]));
            foreach (DwConexao::SEGREDOS as $segredo) {
                if ($request->filled($segredo)) {
                    $conexao->{$segredo} = $request->string($segredo)->toString();
                }
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
            'acesso' => $conexao->acesso ?: 'direto',
            'ssh_host' => $conexao->ssh_host,
            'ssh_port' => $conexao->ssh_port ?: 22,
            'ssh_username' => $conexao->ssh_username,
            'ssh_auth' => $conexao->ssh_auth ?: 'chave',
            'vpn_tipo' => $conexao->vpn_tipo,
            'vpn_servidor' => $conexao->vpn_servidor,
            'vpn_username' => $conexao->vpn_username,
            'tem_senha' => $conexao->temSegredo('senha'),
            'tem_ssh_senha' => $conexao->temSegredo('ssh_senha'),
            'tem_ssh_chave' => $conexao->temSegredo('ssh_chave_privada'),
            'tem_vpn_config' => $conexao->temSegredo('vpn_config'),
            'tem_vpn_psk' => $conexao->temSegredo('vpn_psk'),
            'tem_vpn_senha' => $conexao->temSegredo('vpn_senha'),
            'variaveis_count' => (int) $conexao->variaveis_count,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function regrasTeste(bool $criar): array
    {
        return [
            'driver' => ['required', 'in:mysql'],
            'host' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'database' => ['required', 'string'],
            'username' => ['required', 'string'],
            'senha' => [$criar ? 'required' : 'nullable', 'string'],
            'ssl' => ['sometimes', 'boolean'],
            'acesso' => ['nullable', Rule::in(DwConexao::ACESSOS)],
            'ssh_host' => ['nullable', 'string', 'max:255'],
            'ssh_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'ssh_username' => ['nullable', 'string', 'max:128'],
            'ssh_auth' => ['nullable', Rule::in(DwConexao::SSH_AUTHS)],
            'ssh_senha' => ['nullable', 'string', 'max:500'],
            'ssh_chave_privada' => ['nullable', 'string', 'max:16000'],
            'ssh_passphrase' => ['nullable', 'string', 'max:500'],
            'vpn_tipo' => ['nullable', Rule::in(DwConexao::VPN_TIPOS)],
            'vpn_servidor' => ['nullable', 'string', 'max:255'],
            'vpn_psk' => ['nullable', 'string', 'max:500'],
            'vpn_config' => ['nullable', 'string', 'max:20000'],
            'vpn_username' => ['nullable', 'string', 'max:128'],
            'vpn_senha' => ['nullable', 'string', 'max:500'],
        ];
    }
}
