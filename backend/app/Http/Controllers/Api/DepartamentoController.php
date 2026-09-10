<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Departamento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DepartamentoController extends Controller
{
    public function index()
    {
        return Departamento::query()
            ->with(['cargoLider', 'cargos' => fn ($q) => $q->orderBy('nome')])
            ->orderBy('nome')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $departamento = DB::transaction(function () use ($data) {
            $departamento = Departamento::query()->create([
                'nome' => $data['nome'],
                'ativo' => $data['ativo'] ?? true,
            ]);
            $this->syncCargos($departamento, $data['cargos'] ?? []);

            return $departamento->fresh(['cargoLider', 'cargos']);
        });

        return response()->json($departamento, 201);
    }

    public function show(Departamento $departamento)
    {
        return $departamento->load(['cargoLider', 'cargos' => fn ($q) => $q->orderBy('nome')]);
    }

    public function update(Request $request, Departamento $departamento)
    {
        $data = $this->validated($request, updating: true);

        $departamento = DB::transaction(function () use ($data, $departamento) {
            $departamento->update([
                'nome' => $data['nome'] ?? $departamento->nome,
                'ativo' => $data['ativo'] ?? $departamento->ativo,
            ]);

            if (array_key_exists('cargos', $data)) {
                $this->syncCargos($departamento, $data['cargos']);
            } elseif (array_key_exists('cargo_lider_id', $data)) {
                $this->aplicarCargoLider($departamento, $data['cargo_lider_id']);
            }

            return $departamento->fresh(['cargoLider', 'cargos']);
        });

        return $departamento;
    }

    public function destroy(Departamento $departamento)
    {
        $departamento->update(['ativo' => false]);

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, bool $updating = false): array
    {
        return $request->validate([
            'nome' => [$updating ? 'sometimes' : 'required', 'string', 'max:120'],
            'ativo' => ['boolean'],
            'cargo_lider_id' => ['nullable', 'integer', 'exists:cargos,id'],
            'cargos' => ['sometimes', 'array'],
            'cargos.*.id' => ['nullable', 'integer', 'exists:cargos,id'],
            'cargos.*.nome' => ['required_with:cargos', 'string', 'max:120'],
            'cargos.*.ativo' => ['boolean'],
            'cargos.*.lider' => ['boolean'],
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $cargos
     */
    private function syncCargos(Departamento $departamento, array $cargos): void
    {
        $lideres = collect($cargos)->filter(fn (array $row) => ($row['lider'] ?? false) === true);
        if ($lideres->count() > 1) {
            throw ValidationException::withMessages([
                'cargos' => 'Selecione apenas um cargo líder.',
            ]);
        }

        $liderId = null;

        foreach ($cargos as $row) {
            $payload = [
                'nome' => $row['nome'],
                'ativo' => $row['ativo'] ?? true,
            ];

            if (! empty($row['id'])) {
                $cargo = $departamento->cargos()->whereKey($row['id'])->first();
                if (! $cargo) {
                    throw ValidationException::withMessages([
                        'cargos' => 'Um dos cargos não pertence a este departamento.',
                    ]);
                }
                $cargo->update($payload);
            } else {
                $cargo = $departamento->cargos()->create($payload);
            }

            if (($row['lider'] ?? false) === true) {
                if (! $cargo->ativo) {
                    throw ValidationException::withMessages([
                        'cargos' => 'O cargo líder precisa estar ativo.',
                    ]);
                }
                $liderId = $cargo->id;
            }
        }

        $departamento->update(['cargo_lider_id' => $liderId]);
    }

    private function aplicarCargoLider(Departamento $departamento, mixed $cargoLiderId): void
    {
        if (! $cargoLiderId) {
            $departamento->update(['cargo_lider_id' => null]);

            return;
        }

        $cargo = $departamento->cargos()->whereKey($cargoLiderId)->first();
        if (! $cargo) {
            throw ValidationException::withMessages([
                'cargo_lider_id' => 'O cargo líder deve pertencer ao departamento.',
            ]);
        }
        if (! $cargo->ativo) {
            throw ValidationException::withMessages([
                'cargo_lider_id' => 'O cargo líder precisa estar ativo.',
            ]);
        }

        $departamento->update(['cargo_lider_id' => $cargo->id]);
    }
}
