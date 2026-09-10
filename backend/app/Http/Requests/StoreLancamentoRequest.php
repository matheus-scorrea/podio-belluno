<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLancamentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'valor_realizado' => ['required', 'numeric'],
            'data_evento' => ['required', 'date'],
            'observacao' => ['nullable', 'string', 'max:500'],
            'departamento_id' => ['nullable', 'exists:departamentos,id'],
            'cargo_id' => ['nullable', 'exists:cargos,id'],
            'usuario_alvo_id' => ['nullable', 'exists:users,id'],
        ];
    }
}
