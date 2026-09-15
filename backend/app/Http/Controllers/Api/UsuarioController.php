<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Meta;
use App\Models\MetaLancamento;
use App\Models\User;
use App\Support\SenhaTemporaria;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UsuarioController extends Controller
{
    public function index()
    {
        return UserResource::collection(
            User::query()->with(['departamento', 'cargo'])->orderBy('name')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'unique:users,email'],
            'is_direcao' => ['boolean'],
            'ativo' => ['boolean'],
            'departamento_id' => ['nullable', 'exists:departamentos,id', 'required_unless:is_direcao,true,1'],
            'cargo_id' => ['nullable', 'exists:cargos,id', 'required_unless:is_direcao,true,1'],
        ]);

        $senha = SenhaTemporaria::gerar();
        $user = User::query()->create([
            ...$data,
            'password' => $senha,
            'must_change_password' => true,
        ]);

        return $this->respostaComConvite($user, [
            'senha_temporaria' => $senha,
            'mensagem' => SenhaTemporaria::mensagem($user, $senha),
        ], 201);
    }

    public function show(User $usuario)
    {
        return new UserResource($usuario);
    }

    public function update(Request $request, User $usuario)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($usuario->id)],
            'is_direcao' => ['boolean'],
            'ativo' => ['boolean'],
            'departamento_id' => ['nullable', 'exists:departamentos,id'],
            'cargo_id' => ['nullable', 'exists:cargos,id'],
        ]);

        if (($data['is_direcao'] ?? $usuario->is_direcao) === true) {
            $data['departamento_id'] = null;
            $data['cargo_id'] = null;
        }

        if (array_key_exists('ativo', $data) && $data['ativo'] === false) {
            $this->impedirAcaoNaPropriaConta($request, $usuario, 'inativar');
        }

        $usuario->update($data);

        return new UserResource($usuario->fresh());
    }

    public function senhaTemporaria(Request $request, User $usuario)
    {
        $this->impedirAcaoNaPropriaConta($request, $usuario, 'redefinir a senha de');

        return $this->respostaComConvite($usuario, SenhaTemporaria::emitir($usuario));
    }

    public function destroy(Request $request, User $usuario)
    {
        $this->impedirAcaoNaPropriaConta($request, $usuario, 'excluir');

        $temHistorico = Meta::query()->where('created_by', $usuario->id)->exists()
            || MetaLancamento::query()->where('lancado_por', $usuario->id)->exists();

        if ($temHistorico) {
            throw ValidationException::withMessages([
                'usuario' => 'Este usuário já criou metas ou lançou progresso. Inative a conta para preservar o histórico.',
            ]);
        }

        $usuario->delete();

        return response()->noContent();
    }

    /**
     * @param  array{senha_temporaria: string, mensagem: string}  $convite
     */
    private function respostaComConvite(User $usuario, array $convite, int $status = 200)
    {
        return (new UserResource($usuario->fresh()))
            ->additional($convite)
            ->response()
            ->setStatusCode($status);
    }

    private function impedirAcaoNaPropriaConta(Request $request, User $usuario, string $acao): void
    {
        if ($request->user()?->is($usuario)) {
            throw ValidationException::withMessages([
                'usuario' => "Você não pode {$acao} a própria conta.",
            ]);
        }
    }
}
