<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['nome', 'cargo_lider_id', 'ativo'])]
class Departamento extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
        ];
    }

    public function cargoLider(): BelongsTo
    {
        return $this->belongsTo(Cargo::class, 'cargo_lider_id');
    }

    public function cargos(): HasMany
    {
        return $this->hasMany(Cargo::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
