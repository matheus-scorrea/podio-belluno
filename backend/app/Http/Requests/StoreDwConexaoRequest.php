<?php

namespace App\Http\Requests;

use App\Models\DwConexao;
use App\Support\DwHost;
use App\Support\DwVpnWireguard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Throwable;

class StoreDwConexaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_direcao ?? false;
    }

    public function rules(): array
    {
        $criar = $this->isMethod('post');
        $acesso = $this->input('acesso', 'direto');

        return [
            'nome' => ['required', 'string', 'max:120'],
            'driver' => ['required', Rule::in(DwConexao::DRIVERS)],
            'host' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'database' => ['required', 'string', 'max:128'],
            'username' => ['required', 'string', 'max:128'],
            'senha' => [$criar ? 'required' : 'nullable', 'string', 'max:500'],
            'ssl' => ['sometimes', 'boolean'],
            'acesso' => ['required', Rule::in(DwConexao::ACESSOS)],
            'ssh_host' => [Rule::requiredIf($acesso === 'ssh'), 'nullable', 'string', 'max:255'],
            'ssh_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'ssh_username' => [Rule::requiredIf($acesso === 'ssh'), 'nullable', 'string', 'max:128'],
            'ssh_auth' => [Rule::requiredIf($acesso === 'ssh'), 'nullable', Rule::in(DwConexao::SSH_AUTHS)],
            'ssh_senha' => [Rule::requiredIf($criar && $acesso === 'ssh' && $this->input('ssh_auth') === 'senha'), 'nullable', 'string', 'max:500'],
            'ssh_chave_privada' => [Rule::requiredIf($criar && $acesso === 'ssh' && $this->input('ssh_auth') !== 'senha'), 'nullable', 'string', 'max:16000'],
            'ssh_passphrase' => ['nullable', 'string', 'max:500'],
            'vpn_tipo' => [Rule::requiredIf($acesso === 'vpn'), 'nullable', Rule::in(DwConexao::VPN_TIPOS)],
            'vpn_servidor' => [Rule::requiredIf($acesso === 'vpn' && $this->input('vpn_tipo') === 'l2tp'), 'nullable', 'string', 'max:255'],
            'vpn_psk' => [Rule::requiredIf($criar && $acesso === 'vpn' && $this->input('vpn_tipo') === 'l2tp'), 'nullable', 'string', 'max:500'],
            'vpn_config' => [Rule::requiredIf($criar && $acesso === 'vpn' && $this->input('vpn_tipo') !== 'l2tp'), 'nullable', 'string', 'max:20000'],
            'vpn_username' => [Rule::requiredIf($acesso === 'vpn' && $this->input('vpn_tipo') === 'l2tp'), 'nullable', 'string', 'max:128'],
            'vpn_senha' => [Rule::requiredIf($criar && $acesso === 'vpn' && $this->input('vpn_tipo') === 'l2tp'), 'nullable', 'string', 'max:500'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if (! DwHost::ehSeguro($this->input('host'))) {
                    $validator->errors()->add('host', 'Host do banco inválido.');
                }
                if ($this->input('acesso') === 'ssh') {
                    if (! DwHost::ehSeguro($this->input('ssh_host'))) {
                        $validator->errors()->add('ssh_host', 'Host SSH inválido.');
                    }
                    if (! DwHost::usuarioSeguro($this->input('ssh_username'))) {
                        $validator->errors()->add('ssh_username', 'Usuário SSH inválido.');
                    }
                }
                if ($this->input('acesso') === 'ssh' && $this->isMethod('put')) {
                    $atual = $this->route('conexao');
                    if ($atual instanceof DwConexao) {
                        if ($this->input('ssh_auth') === 'chave' && ! filled($this->input('ssh_chave_privada')) && ! $atual->temSegredo('ssh_chave_privada')) {
                            $validator->errors()->add('ssh_chave_privada', 'Informe a chave privada SSH.');
                        }
                        if ($this->input('ssh_auth') === 'senha' && ! filled($this->input('ssh_senha')) && ! $atual->temSegredo('ssh_senha')) {
                            $validator->errors()->add('ssh_senha', 'Informe a senha SSH.');
                        }
                    }
                }
                if ($this->input('acesso') === 'vpn' && $this->input('vpn_tipo') === 'l2tp') {
                    if (! DwHost::ehSeguro($this->input('vpn_servidor'))) {
                        $validator->errors()->add('vpn_servidor', 'Servidor L2TP inválido.');
                    }
                    if (! DwHost::usuarioVpn($this->input('vpn_username'))) {
                        $validator->errors()->add('vpn_username', 'Usuário L2TP inválido.');
                    }
                    if (filled($this->input('vpn_psk')) && preg_match('/["\\\\\\r\\n]/', (string) $this->input('vpn_psk')) === 1) {
                        $validator->errors()->add('vpn_psk', 'A PSK não pode conter aspas, barra invertida ou quebra de linha.');
                    }
                    if (filled($this->input('vpn_senha')) && preg_match('/["\\\\\\r\\n]/', (string) $this->input('vpn_senha')) === 1) {
                        $validator->errors()->add('vpn_senha', 'A senha L2TP não pode conter aspas, barra invertida ou quebra de linha.');
                    }
                    if ($this->isMethod('put')) {
                        $atual = $this->route('conexao');
                        if ($atual instanceof DwConexao) {
                            if (! filled($this->input('vpn_psk')) && ! $atual->temSegredo('vpn_psk')) {
                                $validator->errors()->add('vpn_psk', 'Informe a chave pré-compartilhada (PSK).');
                            }
                            if (! filled($this->input('vpn_senha')) && ! $atual->temSegredo('vpn_senha')) {
                                $validator->errors()->add('vpn_senha', 'Informe a senha da VPN L2TP.');
                            }
                        }
                    }
                }
                if ($this->input('acesso') === 'vpn' && $this->input('vpn_tipo') !== 'l2tp' && $this->isMethod('put')) {
                    $atual = $this->route('conexao');
                    if ($atual instanceof DwConexao && ! filled($this->input('vpn_config')) && ! $atual->temSegredo('vpn_config')) {
                        $validator->errors()->add('vpn_config', 'Cole a configuração da VPN.');
                    }
                }
                if ($this->input('acesso') === 'vpn' && $this->input('vpn_tipo') === 'wireguard' && filled($this->input('vpn_config'))) {
                    try {
                        DwVpnWireguard::analisar((string) $this->input('vpn_config'));
                    } catch (Throwable $e) {
                        $validator->errors()->add('vpn_config', $e->getMessage());
                    }
                }
            },
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'ssl' => $this->boolean('ssl'),
            'port' => $this->filled('port') ? $this->integer('port') : 3306,
            'acesso' => $this->input('acesso', 'direto') ?: 'direto',
            'ssh_port' => $this->filled('ssh_port') ? $this->integer('ssh_port') : 22,
        ]);
    }
}
