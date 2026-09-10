<?php

namespace App\Policies;

use App\Models\Meta;
use App\Models\User;
use App\Services\AcessoMetas;

class MetaPolicy
{
    public function __construct(private AcessoMetas $acesso) {}

    public function viewAny(User $user): bool
    {
        return $user->ativo;
    }

    public function view(User $user, Meta $meta): bool
    {
        return $meta->enquadra($user);
    }

    public function create(User $user): bool
    {
        return $user->is_direcao;
    }

    public function update(User $user, Meta $meta): bool
    {
        return $user->is_direcao;
    }

    public function delete(User $user, Meta $meta): bool
    {
        return $user->is_direcao;
    }

    public function lancarProgresso(User $user, Meta $meta): bool
    {
        if ($user->is_direcao) {
            return true;
        }

        return $this->acesso->podeLancarAlgumGrao($user, $meta);
    }
}
