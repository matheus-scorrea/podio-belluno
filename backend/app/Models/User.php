<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'departamento_id', 'cargo_id', 'is_direcao', 'ativo'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_direcao' => 'boolean',
            'ativo' => 'boolean',
        ];
    }

    public function departamento(): BelongsTo
    {
        return $this->belongsTo(Departamento::class);
    }

    public function cargo(): BelongsTo
    {
        return $this->belongsTo(Cargo::class);
    }

    public function lancamentos(): HasMany
    {
        return $this->hasMany(MetaLancamento::class, 'lancado_por');
    }

    public function isLider(): bool
    {
        if ($this->is_direcao || ! $this->cargo_id || ! $this->departamento_id) {
            return false;
        }

        $this->loadMissing('departamento');

        return $this->departamento?->cargo_lider_id === $this->cargo_id;
    }

    public function perfil(): string
    {
        if ($this->is_direcao) {
            return 'direcao';
        }

        return $this->isLider() ? 'lider' : 'colaborador';
    }

    public function perfilLabel(): string
    {
        $this->loadMissing('departamento');

        return match ($this->perfil()) {
            'direcao' => 'Direção',
            'lider' => 'Líder - '.($this->departamento?->nome ?? ''),
            default => 'Colaborador'.($this->departamento?->nome ? ' - '.$this->departamento->nome : ''),
        };
    }
}
