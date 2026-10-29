<?php

namespace Tests\Unit;

use App\Support\DwConsultaSql;
use InvalidArgumentException;
use Tests\TestCase;

class DwConsultaSqlTest extends TestCase
{
    public function test_aceita_select_com_ano_e_mes(): void
    {
        $sql = DwConsultaSql::normalizar('  SELECT valor FROM fato_indicadores WHERE ano = :ano AND mes = :mes;  ');

        $this->assertSame(
            'SELECT valor FROM fato_indicadores WHERE ano = :ano AND mes = :mes',
            $sql
        );
    }

    public function test_rejeita_insert_e_multiplos_statements(): void
    {
        $this->expectException(InvalidArgumentException::class);
        DwConsultaSql::normalizar('INSERT INTO fatos (valor) VALUES (1)');
    }

    public function test_rejeita_parametro_desconhecido(): void
    {
        $this->expectException(InvalidArgumentException::class);
        DwConsultaSql::normalizar('SELECT valor FROM fatos WHERE codigo = :codigo');
    }

    public function test_rejeita_comentario(): void
    {
        $this->expectException(InvalidArgumentException::class);
        DwConsultaSql::normalizar('SELECT valor FROM fatos -- drop');
    }
}
