<?php

namespace App\Http\Requests;

use App\Models\Variavel;
use App\Support\DwConsultaSql;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use InvalidArgumentException;

class StoreVariavelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_direcao ?? false;
    }

    public function rules(): array
    {
        $variavel = $this->route('variavel');
        $id = $variavel instanceof Variavel ? $variavel->id : null;

        return [
            'nome' => ['required', 'string', 'max:180'],
            'chave' => [
                $id === null ? 'required' : 'sometimes',
                'string',
                'max:80',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('variaveis', 'chave')->ignore($id),
            ],
            'unidade' => ['required', Rule::in(Variavel::UNIDADES)],
            'descricao' => ['nullable', 'string'],
            'consulta_sql' => ['required', 'string'],
            'conexao_id' => ['required', 'integer', 'exists:dw_conexoes,id'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $sql = $this->input('consulta_sql');
                if (! is_string($sql) || trim($sql) === '') {
                    return;
                }

                try {
                    $this->merge(['consulta_sql' => DwConsultaSql::normalizar($sql)]);
                } catch (InvalidArgumentException $e) {
                    $validator->errors()->add('consulta_sql', $e->getMessage());
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'chave.regex' => 'A chave deve começar com letra minúscula e usar só letras, números e underscore.',
        ];
    }
}
