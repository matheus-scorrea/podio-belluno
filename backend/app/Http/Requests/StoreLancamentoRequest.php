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
        $porPessoa = $meta instanceof Meta && $meta->isPorPessoa();
        $user = $this->user();
        $exigePessoa = $porPessoa && ($user?->is_direcao || $user?->isLider());

        return [
            'valor_realizado' => ['required', 'numeric'],
            'valor_adesao' => [$meta instanceof Meta && $meta->isComissao() ? 'required' : 'nullable', 'numeric', 'min:0'],
            'data_evento' => ['required', 'date'],
            'observacao' => ['nullable', 'string', 'max:500'],
            'departamento_id' => ['nullable', 'exists:departamentos,id'],
            'cargo_id' => ['nullable', 'exists:cargos,id'],
            'usuario_alvo_id' => [$exigePessoa ? 'required' : 'nullable', 'exists:users,id'],
        ];
    }

    public function attributes(): array
    {
        return [
            'valor_realizado' => 'valor realizado',
            'valor_adesao' => 'adesão',
            'data_evento' => 'data do evento',
            'usuario_alvo_id' => 'pessoa',
        ];
    }

    public function messages(): array
    {
        return [
            'usuario_alvo_id.required' => 'Selecione a pessoa deste lançamento.',
        ];
    }
}
