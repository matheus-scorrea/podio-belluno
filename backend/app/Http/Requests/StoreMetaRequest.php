<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMetaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_direcao ?? false;
    }

    public function rules(): array
    {
        return [
            'titulo' => ['required', 'string', 'max:180'],
            'descricao' => ['nullable', 'string'],
            'ano' => ['required', 'integer', 'min:2020', 'max:2100'],
            'mes' => ['required', 'integer', 'min:1', 'max:12'],
            'tipo_escopo' => ['required', Rule::in(['individual', 'cargo', 'departamento', 'global'])],
            'valor_meta' => ['required', 'numeric', 'min:0'],
            'valor_bonus' => ['nullable', 'numeric', 'min:0'],
            'unidade' => ['required', Rule::in(['%', 'R$', 'un', 'marco'])],
            'sentido' => ['required', Rule::in(['maior_melhor', 'menor_melhor'])],
            'chart_tipo' => ['required', Rule::in(['gauge', 'progress_bar', 'line', 'column', 'marco'])],
            'chart_cor' => ['required', 'regex:/^#([A-Fa-f0-9]{6})$/'],
            'usuario_ids' => ['array', 'required_if:tipo_escopo,individual'],
            'usuario_ids.*' => ['exists:users,id'],
            'cargo_ids' => ['array', 'required_if:tipo_escopo,cargo'],
            'cargo_ids.*' => ['exists:cargos,id'],
            'departamento_ids' => ['array', 'required_if:tipo_escopo,departamento'],
            'departamento_ids.*' => ['exists:departamentos,id'],
        ];
    }
}
