<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cargo;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CargoController extends Controller
{
    public function index(Request $request)
    {
        return Cargo::query()
            ->with('departamento')
            ->when($request->departamento_id, fn ($q, $id) => $q->where('departamento_id', $id))
            ->orderBy('nome')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nome' => ['required', 'string', 'max:120'],
            'departamento_id' => ['required', 'exists:departamentos,id'],
            'ativo' => ['boolean'],
        ]);

        return response()->json(Cargo::query()->create($data), 201);
    }

    public function show(Cargo $cargo)
    {
        return $cargo->load('departamento');
    }

    public function update(Request $request, Cargo $cargo)
    {
        $data = $request->validate([
            'nome' => ['sometimes', 'string', 'max:120'],
            'departamento_id' => ['sometimes', 'exists:departamentos,id'],
            'ativo' => ['boolean'],
        ]);

        $cargo->update($data);
        $cargo->loadMissing('departamento');

        if (($data['ativo'] ?? true) === false && $cargo->departamento?->cargo_lider_id === $cargo->id) {
            $cargo->departamento->update(['cargo_lider_id' => null]);
        }

        return $cargo->fresh('departamento');
    }

    public function destroy(Cargo $cargo)
    {
        $cargo->loadMissing('departamento');

        if (User::query()->where('cargo_id', $cargo->id)->exists()) {
            throw ValidationException::withMessages([
                'cargo' => 'Há pessoas com este cargo. Troque o cargo delas ou inative este cargo em vez de excluir.',
            ]);
        }

        if (DB::table('meta_cargo')->where('cargo_id', $cargo->id)->exists()) {
            throw ValidationException::withMessages([
                'cargo' => 'Há metas vinculadas a este cargo. Inative-o para preservar o histórico.',
            ]);
        }

        if ($cargo->departamento?->cargo_lider_id === $cargo->id) {
            $cargo->departamento->update(['cargo_lider_id' => null]);
        }

        $cargo->forceDelete();

        return response()->noContent();
    }
}
