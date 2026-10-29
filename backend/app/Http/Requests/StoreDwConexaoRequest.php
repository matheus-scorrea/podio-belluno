<?php

namespace App\Http\Requests;

use App\Models\DwConexao;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDwConexaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_direcao ?? false;
    }

    public function rules(): array
    {
        $criar = $this->isMethod('post');

        return [
            'nome' => ['required', 'string', 'max:120'],
            'driver' => ['required', Rule::in(DwConexao::DRIVERS)],
            'host' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'database' => ['required', 'string', 'max:128'],
            'username' => ['required', 'string', 'max:128'],
            'senha' => [$criar ? 'required' : 'nullable', 'string', 'max:500'],
            'ssl' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'ssl' => $this->boolean('ssl'),
            'port' => $this->filled('port') ? $this->integer('port') : 3306,
        ]);
    }
}
