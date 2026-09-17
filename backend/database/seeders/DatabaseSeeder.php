<?php

namespace Database\Seeders;

use App\Models\Cargo;
use App\Models\Departamento;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seed apenas para desenvolvimento local (`php artisan migrate --seed`).
 * Não é executado no compose de produção.
 *
 * Senha padrão das contas abaixo: valor de $password neste arquivo.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = 'password';

        $this->unirCoordenacaoNoSucesso();

        $sucesso = Departamento::query()->firstOrCreate(['nome' => 'Sucesso do Cliente']);
        $rh = Departamento::query()->firstOrCreate(['nome' => 'RH e Call Center']);
        $mkt = Departamento::query()->firstOrCreate(['nome' => 'Comercial e MKT']);
        $ti = Departamento::query()->firstOrCreate(['nome' => 'TI e DEV']);

        $cargoCoordCs = $this->cargo('Coordenador de CS', $sucesso);
        $cargoExecCs = $this->cargo('Executivo de CS', $sucesso);
        $cargoLiderRh = $this->cargo('Líder de RH e Call Center', $rh);
        $cargoAnalistaRh = $this->cargo('Analista de RH', $rh);
        $cargoLiderMkt = $this->cargo('Líder Comercial e MKT', $mkt);
        $cargoAnalistaMkt = $this->cargo('Analista Comercial', $mkt);
        $cargoLiderTi = $this->cargo('Líder de TI', $ti);
        $cargoAnalistaTi = $this->cargo('Analista de TI', $ti);

        $sucesso->update(['cargo_lider_id' => $cargoCoordCs->id]);
        $rh->update(['cargo_lider_id' => $cargoLiderRh->id]);
        $mkt->update(['cargo_lider_id' => $cargoLiderMkt->id]);
        $ti->update(['cargo_lider_id' => $cargoLiderTi->id]);

        $this->user([
            'name' => 'Maria Direção',
            'email' => 'direcao@bellunotec.com',
            'password' => $password,
            'is_direcao' => true,
            'ativo' => true,
        ]);

        $this->user([
            'name' => 'João Silva',
            'email' => 'joao.silva@bellunotec.com',
            'password' => $password,
            'departamento_id' => $ti->id,
            'cargo_id' => $cargoLiderTi->id,
            'ativo' => true,
        ]);

        $this->user([
            'name' => 'Ana Costa',
            'email' => 'ana.costa@bellunotec.com',
            'password' => $password,
            'departamento_id' => $ti->id,
            'cargo_id' => $cargoAnalistaTi->id,
            'ativo' => true,
        ]);

        $this->user([
            'name' => 'João Coordenador CS',
            'email' => 'joao.cs@bellunotec.com',
            'password' => $password,
            'departamento_id' => $sucesso->id,
            'cargo_id' => $cargoCoordCs->id,
            'ativo' => true,
        ]);

        $this->user([
            'name' => 'Everson',
            'email' => 'everson@bellunotec.com',
            'password' => $password,
            'departamento_id' => $sucesso->id,
            'cargo_id' => $cargoExecCs->id,
            'ativo' => true,
        ]);

        foreach ([
            ['Larissa', 'larissa@bellunotec.com'],
            ['Bruno', 'bruno@bellunotec.com'],
            ['Aline', 'aline@bellunotec.com'],
            ['Murilo', 'murilo@bellunotec.com'],
        ] as [$name, $email]) {
            $this->user([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'departamento_id' => $sucesso->id,
                'cargo_id' => $cargoExecCs->id,
                'ativo' => true,
            ]);
        }

        $this->user([
            'name' => 'Fernanda Lima',
            'email' => 'fernanda.lima@bellunotec.com',
            'password' => $password,
            'departamento_id' => $rh->id,
            'cargo_id' => $cargoLiderRh->id,
            'ativo' => true,
        ]);

        $this->user([
            'name' => 'Carla Mendes',
            'email' => 'carla.mendes@bellunotec.com',
            'password' => $password,
            'departamento_id' => $mkt->id,
            'cargo_id' => $cargoLiderMkt->id,
            'ativo' => true,
        ]);

        $this->user([
            'name' => 'Pedro Alves',
            'email' => 'pedro.alves@bellunotec.com',
            'password' => $password,
            'departamento_id' => $mkt->id,
            'cargo_id' => $cargoAnalistaMkt->id,
            'ativo' => true,
        ]);

        $this->user([
            'name' => 'Roberto Dias',
            'email' => 'roberto.dias@bellunotec.com',
            'password' => $password,
            'departamento_id' => $rh->id,
            'cargo_id' => $cargoAnalistaRh->id,
            'ativo' => true,
        ]);

        $this->call(OkrBancoSeeder::class);
    }

    private function unirCoordenacaoNoSucesso(): void
    {
        $sucesso = Departamento::query()->firstOrCreate(['nome' => 'Sucesso do Cliente']);
        $coordenacao = Departamento::withTrashed()->where('nome', 'Coordenação CS')->first();

        if ($coordenacao && $coordenacao->id !== $sucesso->id) {
            $this->moverVinculosDepartamento($coordenacao->id, $sucesso->id);
            Cargo::withTrashed()->where('departamento_id', $coordenacao->id)->update(['departamento_id' => $sucesso->id]);
            User::query()->where('departamento_id', $coordenacao->id)->update(['departamento_id' => $sucesso->id]);
            $coordenacao->cargo_lider_id = null;
            $coordenacao->save();
            $coordenacao->forceDelete();
        }

        Cargo::withTrashed()->where('nome', 'Coordenador CS')->update(['nome' => 'Coordenador de CS']);

        $executivo = Cargo::query()->firstOrCreate(
            ['nome' => 'Executivo de CS', 'departamento_id' => $sucesso->id],
        );
        $liderAntigo = Cargo::withTrashed()->where('nome', 'Líder de Sucesso do Cliente')->first();

        if ($liderAntigo && $liderAntigo->id !== $executivo->id) {
            User::query()->where('cargo_id', $liderAntigo->id)->update(['cargo_id' => $executivo->id]);
            $this->moverVinculosCargo($liderAntigo->id, $executivo->id);
            if ($sucesso->cargo_lider_id === $liderAntigo->id) {
                $sucesso->update(['cargo_lider_id' => null]);
            }
            $liderAntigo->forceDelete();
        }
    }

    private function moverVinculosDepartamento(int $origemId, int $destinoId): void
    {
        foreach (DB::table('meta_departamento')->where('departamento_id', $origemId)->get() as $row) {
            $jaExiste = DB::table('meta_departamento')
                ->where('meta_id', $row->meta_id)
                ->where('departamento_id', $destinoId)
                ->exists();

            if ($jaExiste) {
                DB::table('meta_departamento')->where('id', $row->id)->delete();
            } else {
                DB::table('meta_departamento')->where('id', $row->id)->update(['departamento_id' => $destinoId]);
            }
        }

        DB::table('meta_lancamentos')->where('departamento_id', $origemId)->update(['departamento_id' => $destinoId]);
    }

    private function moverVinculosCargo(int $origemId, int $destinoId): void
    {
        foreach (DB::table('meta_cargo')->where('cargo_id', $origemId)->get() as $row) {
            $jaExiste = DB::table('meta_cargo')
                ->where('meta_id', $row->meta_id)
                ->where('cargo_id', $destinoId)
                ->exists();

            if ($jaExiste) {
                DB::table('meta_cargo')->where('id', $row->id)->delete();
            } else {
                DB::table('meta_cargo')->where('id', $row->id)->update(['cargo_id' => $destinoId]);
            }
        }

        DB::table('meta_lancamentos')->where('cargo_id', $origemId)->update(['cargo_id' => $destinoId]);
    }

    private function cargo(string $nome, Departamento $departamento): Cargo
    {
        return Cargo::query()->firstOrCreate(
            ['nome' => $nome, 'departamento_id' => $departamento->id],
        );
    }

    private function user(array $attributes): User
    {
        return User::query()->firstOrCreate(
            ['email' => $attributes['email']],
            $attributes,
        );
    }
}
