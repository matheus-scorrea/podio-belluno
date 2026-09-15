<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\RegrasSenha;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! $user->ativo || ! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => 'Credenciais inválidas ou usuário inativo.',
            ]);
        }

        Auth::login($request->user() ?? $user);

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return new UserResource($request->user());
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->noContent();
    }

    public function me(Request $request)
    {
        return new UserResource($request->user());
    }

    public function atualizarSenha(Request $request)
    {
        $user = $request->user();
        $regras = [
            'password' => RegrasSenha::nova(),
        ];

        if (! $user->must_change_password) {
            $regras['senha_atual'] = ['required', 'string'];
        }

        $data = $request->validate($regras);

        if (! $user->must_change_password && ! Hash::check($data['senha_atual'], $user->password)) {
            throw ValidationException::withMessages([
                'senha_atual' => 'Senha atual incorreta.',
            ]);
        }

        if (Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => 'Escolha uma senha diferente da atual.',
            ]);
        }

        $user->update([
            'password' => $data['password'],
            'must_change_password' => false,
        ]);

        return new UserResource($user->fresh());
    }
}
