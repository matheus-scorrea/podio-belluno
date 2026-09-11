<?php

namespace App\Http\Requests;

use App\Models\Meta;
use Illuminate\Foundation\Http\FormRequest;

class StoreLancamentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $meta = $this->route('meta');
        $comissao = $meta instanceof Meta && $meta->isComissao();

        return [
            'valor_realizado' => ['required', 'numeric'],
            'valor_adesao' => [$comissao ? 'required' : 'nullable', 'numeric', 'min:0'],
            'data_evento' => ['required', 'date'],
            'observacao' => ['nullable', 'string', 'max:500'],
            'departamento_id' => ['nullable', 'exists:departamentos,id'],
            'cargo_id' => ['nullable', 'exists:cargos,id'],
            'usuario_alvo_id' => [$comissao ? 'required' : 'nullable', 'exists:users,id'],
        ];
    }
}
