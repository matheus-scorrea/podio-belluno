<?php

namespace App\Services;

use App\Models\Cargo;
use App\Models\Departamento;
use App\Models\Meta;
use App\Models\User;
use Illuminate\Support\Collection;

class AcessoMetas
{
    public function podeLancar(User $user, Meta $meta, array $alvo = []): bool
    {
        if ($user->is_direcao) {
            return true;
        }

        $meta->loadMissing(['departamentos', 'cargos', 'usuarios']);

        if ($user->isLider()) {
            return $this->liderPodeLancar($user, $meta, $alvo);
        }

        return $this->colaboradorPodeLancar($user, $meta, $alvo);
    }

    public function podeLancarAlgumGrao(User $user, Meta $meta): bool
    {
        if ($user->is_direcao) {
            return true;
        }

        $meta->loadMissing(['departamentos', 'cargos', 'usuarios']);

        if ($user->isLider()) {
            if ($meta->isComissao() || $meta->isPorPessoa()) {
                return $this->graosDaMeta($meta)->contains(
                    fn (array $g) => (int) ($g['departamento_id'] ?? 0) === (int) $user->departamento_id
                );
            }

            if (! $meta->isComparativa()) {
                return $this->liderPodeLancar($user, $meta);
            }

            return match ($meta->tipo_escopo) {
                'global', 'departamento' => $this->alvoNoPerimetro($user, $meta, [
                    'departamento_id' => $user->departamento_id,
                ]),
                'cargo' => $meta->cargos->contains(fn (Cargo $c) => $c->departamento_id === $user->departamento_id),
                'individual' => $meta->usuarios->contains(fn (User $u) => $u->departamento_id === $user->departamento_id),
                default => false,
            };
        }

        return $this->colaboradorPodeLancar($user, $meta);
    }

    public function metaNoPerimetro(User $user, Meta $meta): bool
    {
        $deptId = $user->departamento_id;
        $meta->loadMissing(['departamentos', 'cargos', 'usuarios']);

        return match ($meta->tipo_escopo) {
            'departamento' => $meta->departamentos->contains('id', $deptId),
            'cargo' => $meta->cargos->contains(fn (Cargo $c) => $c->departamento_id === $deptId),
            'individual' => $meta->usuarios->contains(fn (User $u) => $u->departamento_id === $deptId),
            'global' => false,
            default => false,
        };
    }

    public function alvoNoPerimetro(User $user, Meta $meta, array $alvo): bool
    {
        $deptId = $user->departamento_id;

        return match ($meta->tipo_escopo) {
            'global', 'departamento' => (int) ($alvo['departamento_id'] ?? 0) === (int) $deptId
                && ($meta->tipo_escopo === 'global' || $meta->departamentos->contains('id', $deptId)),
            'cargo' => $this->cargoAlvoNoPerimetro($user, $meta, $alvo),
            'individual' => $this->usuarioAlvoNoPerimetro($user, $meta, $alvo),
            default => false,
        };
    }

    public function graosDaMeta(Meta $meta): Collection
    {
        $meta->loadMissing(['departamentos', 'cargos.departamento', 'usuarios.departamento']);

        return $this->todosGraos($meta);
    }

    public function graosLancaveis(User $user, Meta $meta): Collection
    {
        $meta->loadMissing(['departamentos', 'cargos', 'usuarios.departamento']);

        if ($user->is_direcao) {
            return $this->graosDaMeta($meta);
        }

        if (! $this->podeLancarAlgumGrao($user, $meta)) {
            return collect();
        }

        if ($user->isLider()) {
            $deptId = $user->departamento_id;

            return $this->todosGraos($meta)->filter(function (array $grao) use ($deptId) {
                return (int) ($grao['departamento_id'] ?? 0) === (int) $deptId
                    || (isset($grao['cargo_id']) && Cargo::find($grao['cargo_id'])?->departamento_id === $deptId)
                    || (isset($grao['usuario_alvo_id']) && User::find($grao['usuario_alvo_id'])?->departamento_id === $deptId);
            })->values();
        }

        return $this->todosGraos($meta)->filter(function (array $grao) use ($user, $meta) {
            if (! $meta->isPorGrao()) {
                return true;
            }

            return (int) ($grao['usuario_alvo_id'] ?? 0) === (int) $user->id;
        })->values();
    }

    private function liderPodeLancar(User $user, Meta $meta, array $alvo = []): bool
    {
        if ($meta->isComissao() || $meta->isPorPessoa()) {
            return $this->usuarioAlvoComissaoNoPerimetro($user, $meta, $alvo);
        }

        if ($meta->isComparativa()) {
            return $this->alvoNoPerimetro($user, $meta, $alvo);
        }

        if ($meta->tipo_escopo === 'global') {
            return false;
        }

        return $this->metaNoPerimetro($user, $meta);
    }

    private function colaboradorPodeLancar(User $user, Meta $meta, array $alvo = []): bool
    {
        if ($meta->isComissao() || $meta->isPorPessoa()) {
            if (! $this->usuarioNoEscopoComissao($user, $meta)) {
                return false;
            }

            $alvoId = (int) ($alvo['usuario_alvo_id'] ?? $user->id);

            return $alvoId === (int) $user->id;
        }

        if ($meta->tipo_escopo !== 'individual') {
            return false;
        }

        if (! $meta->usuarios->contains('id', $user->id)) {
            return false;
        }

        if ($meta->isComparativa()) {
            $alvoId = (int) ($alvo['usuario_alvo_id'] ?? $user->id);

            return $alvoId === (int) $user->id;
        }

        return true;
    }

    private function todosGraos(Meta $meta): Collection
    {
        if ($meta->isComissao() || $meta->isPorPessoa()) {
            return $this->pessoasDoEscopo($meta)->map(fn (User $u) => [
                'label' => $u->name,
                'departamento_id' => $u->departamento_id,
                'cargo_id' => $u->cargo_id,
                'usuario_alvo_id' => $u->id,
            ])->values();
        }

        if (! $meta->isComparativa()) {
            return collect([[
                'label' => $meta->subtitulo(),
                'departamento_id' => null,
                'cargo_id' => null,
                'usuario_alvo_id' => null,
            ]]);
        }

        return match ($meta->tipo_escopo) {
            'global' => Departamento::query()->where('ativo', true)->orderBy('nome')->get()
                ->map(fn (Departamento $d) => [
                    'label' => $d->nome,
                    'departamento_id' => $d->id,
                    'cargo_id' => null,
                    'usuario_alvo_id' => null,
                ]),
            'departamento' => $meta->departamentos->map(fn (Departamento $d) => [
                'label' => $d->nome,
                'departamento_id' => $d->id,
                'cargo_id' => null,
                'usuario_alvo_id' => null,
            ]),
            'cargo' => $meta->cargos->map(fn (Cargo $c) => [
                'label' => $c->nome,
                'departamento_id' => $c->departamento_id,
                'cargo_id' => $c->id,
                'usuario_alvo_id' => null,
            ]),
            'individual' => $meta->usuarios->map(fn (User $u) => [
                'label' => $u->name,
                'departamento_id' => $u->departamento_id,
                'cargo_id' => null,
                'usuario_alvo_id' => $u->id,
            ]),
            default => collect(),
        };
    }

    /**
     * @return Collection<int, User>
     */
    public function pessoasDoEscopo(Meta $meta): Collection
    {
        $meta->loadMissing(['usuarios', 'cargos', 'departamentos']);

        $ativos = User::query()->where('ativo', true)->where('is_direcao', false);

        return match ($meta->tipo_escopo) {
            'individual' => $meta->usuarios
                ->where('is_direcao', false)
                ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
                ->values(),
            'cargo' => $ativos->whereIn('cargo_id', $meta->cargos->pluck('id'))->orderBy('name')->get(),
            'departamento' => $ativos->whereIn('departamento_id', $meta->departamentos->pluck('id'))->orderBy('name')->get(),
            'global' => $ativos->orderBy('name')->get(),
            default => collect(),
        };
    }

    /**
     * @return Collection<int, User>
     */
    private function vendedoresDaMeta(Meta $meta): Collection
    {
        return $this->pessoasDoEscopo($meta);
    }

    private function usuarioNoEscopoComissao(User $alvo, Meta $meta): bool
    {
        if ($alvo->is_direcao) {
            return false;
        }

        $meta->loadMissing(['usuarios', 'cargos', 'departamentos']);

        return match ($meta->tipo_escopo) {
            'individual' => $meta->usuarios->contains('id', $alvo->id),
            'cargo' => $meta->cargos->contains('id', $alvo->cargo_id),
            'departamento' => $meta->departamentos->contains('id', $alvo->departamento_id),
            'global' => true,
            default => false,
        };
    }

    private function usuarioAlvoComissaoNoPerimetro(User $user, Meta $meta, array $alvo): bool
    {
        $alvoUser = User::find($alvo['usuario_alvo_id'] ?? 0);

        return $alvoUser
            && $alvoUser->departamento_id === $user->departamento_id
            && $this->usuarioNoEscopoComissao($alvoUser, $meta);
    }

    private function cargoAlvoNoPerimetro(User $user, Meta $meta, array $alvo): bool
    {
        $cargo = Cargo::find($alvo['cargo_id'] ?? 0);

        return $cargo
            && $cargo->departamento_id === $user->departamento_id
            && $meta->cargos->contains('id', $cargo->id);
    }

    private function usuarioAlvoNoPerimetro(User $user, Meta $meta, array $alvo): bool
    {
        $alvoUser = User::find($alvo['usuario_alvo_id'] ?? 0);

        return $alvoUser
            && $alvoUser->departamento_id === $user->departamento_id
            && $meta->usuarios->contains('id', $alvoUser->id);
    }
}
