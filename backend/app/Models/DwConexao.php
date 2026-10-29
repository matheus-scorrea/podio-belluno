<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

#[Fillable([
    'nome',
    'driver',
    'host',
    'port',
    'database',
    'username',
    'senha',
    'ssl',
    'ativa',
    'acesso',
    'ssh_host',
    'ssh_port',
    'ssh_username',
    'ssh_auth',
    'ssh_senha',
    'ssh_chave_privada',
    'ssh_passphrase',
    'vpn_tipo',
    'vpn_servidor',
    'vpn_psk',
    'vpn_config',
    'vpn_username',
    'vpn_senha',
])]
class DwConexao extends Model
{
    use HasFactory;

    public const DRIVERS = ['mysql'];

    public const ACESSOS = ['direto', 'ssh', 'vpn'];

    public const SSH_AUTHS = ['chave', 'senha'];

    public const VPN_TIPOS = ['openvpn', 'wireguard', 'l2tp'];

    public const SEGREDOS = [
        'senha',
        'ssh_senha',
        'ssh_chave_privada',
        'ssh_passphrase',
        'vpn_config',
        'vpn_senha',
        'vpn_psk',
    ];

    protected $table = 'dw_conexoes';

    protected $hidden = [
        'senha',
        'ssh_senha',
        'ssh_chave_privada',
        'ssh_passphrase',
        'vpn_config',
        'vpn_senha',
        'vpn_psk',
    ];

    protected function casts(): array
    {
        return [
            'port' => 'integer',
            'ssh_port' => 'integer',
            'ssl' => 'boolean',
            'ativa' => 'boolean',
        ];
    }

    public function setSenhaAttribute(?string $value): void
    {
        $this->guardarSegredo('senha', $value);
    }

    public function setSshSenhaAttribute(?string $value): void
    {
        $this->guardarSegredo('ssh_senha', $value);
    }

    public function setSshChavePrivadaAttribute(?string $value): void
    {
        $this->guardarSegredo('ssh_chave_privada', $value);
    }

    public function setSshPassphraseAttribute(?string $value): void
    {
        $this->guardarSegredo('ssh_passphrase', $value);
    }

    public function setVpnConfigAttribute(?string $value): void
    {
        $this->guardarSegredo('vpn_config', $value);
    }

    public function setVpnSenhaAttribute(?string $value): void
    {
        $this->guardarSegredo('vpn_senha', $value);
    }

    public function setVpnPskAttribute(?string $value): void
    {
        $this->guardarSegredo('vpn_psk', $value);
    }

    public function senhaPura(): string
    {
        return $this->segredoPuro('senha');
    }

    public function segredoPuro(string $campo): string
    {
        $cifrada = $this->attributes[$campo] ?? '';
        if ($cifrada === '') {
            return '';
        }

        return Crypt::decryptString($cifrada);
    }

    public function temSegredo(string $campo): bool
    {
        return filled($this->attributes[$campo] ?? null);
    }

    public function variaveis(): HasMany
    {
        return $this->hasMany(Variavel::class, 'conexao_id');
    }

    /**
     * @return array<string, mixed>
     */
    public function configLaravel(): array
    {
        if ($this->driver === 'sqlite') {
            return [
                'driver' => 'sqlite',
                'database' => $this->database !== '' ? $this->database : ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ];
        }

        return [
            'driver' => 'mysql',
            'host' => $this->host,
            'port' => $this->port,
            'database' => $this->database,
            'username' => $this->username,
            'password' => $this->senhaPura(),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
            'options' => $this->ssl ? [
                \PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
            ] : [],
        ];
    }

    private function guardarSegredo(string $campo, ?string $value): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $this->attributes[$campo] = Crypt::encryptString($value);
    }
}
