<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $this->resource->loadMissing(['departamento', 'cargo']);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'is_direcao' => $this->is_direcao,
            'is_lider' => $this->isLider(),
            'perfil' => $this->perfil(),
            'perfil_label' => $this->perfilLabel(),
            'ativo' => $this->ativo,
            'departamento_id' => $this->departamento_id,
            'cargo_id' => $this->cargo_id,
            'departamento' => $this->departamento ? [
                'id' => $this->departamento->id,
                'nome' => $this->departamento->nome,
            ] : null,
            'cargo' => $this->cargo ? [
                'id' => $this->cargo->id,
                'nome' => $this->cargo->nome,
            ] : null,
        ];
    }
}
