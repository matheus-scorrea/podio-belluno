<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Meta;
use App\Models\MetaLancamento;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
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
            'password' => $this->regrasSenha(obrigatoria: true),
            'is_direcao' => ['boolean'],
            'ativo' => ['boolean'],
            'departamento_id' => ['nullable', 'exists:departamentos,id', 'required_unless:is_direcao,true,1'],
            'cargo_id' => ['nullable', 'exists:cargos,id', 'required_unless:is_direcao,true,1'],
        ]);

        $user = User::query()->create(collect($data)->except('password_confirmation')->all());

        return (new UserResource($user))->response()->setStatusCode(201);
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
            'password' => $this->regrasSenha(obrigatoria: false),
            'is_direcao' => ['boolean'],
            'ativo' => ['boolean'],
            'departamento_id' => ['nullable', 'exists:departamentos,id'],
            'cargo_id' => ['nullable', 'exists:cargos,id'],
        ]);

        if (empty($data['password'])) {
            unset($data['password'], $data['password_confirmation']);
        }

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
     * @return list<mixed>
     */
    private function regrasSenha(bool $obrigatoria): array
    {
        $forca = Password::min(8)->mixedCase()->numbers();

        return $obrigatoria
            ? ['required', 'string', 'confirmed', $forca]
            : ['nullable', 'string', 'confirmed', $forca];
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
