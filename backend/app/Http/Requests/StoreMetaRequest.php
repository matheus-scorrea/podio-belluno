<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreMetaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_direcao ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'marco_por_pessoa' => $this->boolean('marco_por_pessoa'),
        ]);
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
            'modo_bonus' => ['nullable', Rule::in(['fixo', 'linear', 'unidade'])],
            'bonus_piso_percentual' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'bonus_teto_percentual' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'bonus_por_unidade_extra' => ['nullable', 'numeric', 'min:0'],
            'unidade' => ['required', Rule::in(['%', 'R$', 'un', 'marco'])],
            'sentido' => ['required', Rule::in(['maior_melhor', 'menor_melhor'])],
            'chart_tipo' => ['required', Rule::in(['gauge', 'progress_bar', 'line', 'column', 'marco', 'comissao'])],
            'chart_cor' => ['required', 'regex:/^#([A-Fa-f0-9]{6})$/'],
            'usuario_ids' => ['array', 'required_if:tipo_escopo,individual'],
            'usuario_ids.*' => ['exists:users,id'],
            'cargo_ids' => ['array', 'required_if:tipo_escopo,cargo'],
            'cargo_ids.*' => ['exists:cargos,id'],
            'departamento_ids' => ['array', 'required_if:tipo_escopo,departamento'],
            'departamento_ids.*' => ['exists:departamentos,id'],
            'marco_por_pessoa' => ['boolean'],
            'niveis_comissao' => ['nullable', 'array', 'required_if:chart_tipo,comissao', 'min:1'],
            'niveis_comissao.*.nome' => ['required_with:niveis_comissao', 'string', 'max:40'],
            'niveis_comissao.*.venda_min' => ['required_with:niveis_comissao', 'numeric', 'min:0'],
            'niveis_comissao.*.adesao_min' => ['required_with:niveis_comissao', 'numeric', 'min:0'],
            'niveis_comissao.*.percentual' => ['required_with:niveis_comissao', 'numeric', 'min:0'],
            'niveis_comissao.*.premio' => ['required_with:niveis_comissao', 'numeric', 'min:0'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($this->input('chart_tipo') === 'comissao'
                    && ! in_array($this->input('tipo_escopo'), ['individual', 'cargo'], true)) {
                    $validator->errors()->add('tipo_escopo', 'Comissão de vendedor se aplica a pessoas ou cargos.');
                }

                $modo = $this->input('modo_bonus', 'fixo') ?: 'fixo';
                $quantitativa = ! in_array($this->input('chart_tipo'), ['marco', 'comissao'], true);

                if (! $quantitativa && $modo !== 'fixo') {
                    $validator->errors()->add('modo_bonus', 'Marco e comissão usam o bônus fixo.');
                }

                if ($quantitativa && $modo !== 'fixo' && $this->input('sentido') === 'menor_melhor') {
                    $validator->errors()->add('modo_bonus', 'Bônus acima do piso só se aplica quando maior é melhor.');
                }

                if ($modo === 'linear') {
                    $piso = $this->input('bonus_piso_percentual');
                    $teto = $this->input('bonus_teto_percentual');
                    if ($teto !== null && $teto !== '' && $piso !== null && $piso !== '' && (float) $teto < (float) $piso) {
                        $validator->errors()->add('bonus_teto_percentual', 'O teto do bônus não pode ser menor que o piso.');
                    }
                }
            },
        ];
    }
}
