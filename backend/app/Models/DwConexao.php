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
])]
class DwConexao extends Model
{
    use HasFactory;

    public const DRIVERS = ['mysql'];

    protected $table = 'dw_conexoes';

    protected $hidden = [
        'senha',
    ];

    protected function casts(): array
    {
        return [
            'port' => 'integer',
            'ssl' => 'boolean',
            'ativa' => 'boolean',
        ];
    }

    public function setSenhaAttribute(?string $value): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $this->attributes['senha'] = Crypt::encryptString($value);
    }

    public function senhaPura(): string
    {
        $cifrada = $this->attributes['senha'] ?? '';
        if ($cifrada === '') {
            return '';
        }

        return Crypt::decryptString($cifrada);
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
}
