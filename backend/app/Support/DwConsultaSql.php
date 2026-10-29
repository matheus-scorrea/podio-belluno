<?php

namespace App\Support;

use InvalidArgumentException;

class DwConsultaSql
{
    public static function normalizar(string $sql): string
    {
        $sql = trim($sql);
        $sql = rtrim($sql, "; \t\n\r");

        if ($sql === '') {
            throw new InvalidArgumentException('Informe a consulta SQL.');
        }

        if (str_contains($sql, ';')) {
            throw new InvalidArgumentException('A consulta deve ser um único SELECT.');
        }

        if (preg_match('/--|\/\*|\*\//', $sql) === 1) {
            throw new InvalidArgumentException('Comentários não são permitidos na consulta.');
        }

        if (preg_match('/^\s*select\b/i', $sql) !== 1) {
            throw new InvalidArgumentException('A consulta precisa começar com SELECT.');
        }

        if (preg_match('/\b(insert|update|delete|drop|alter|truncate|create|grant|replace|into\s+outfile|into\s+dumpfile|load_file)\b/i', $sql) === 1) {
            throw new InvalidArgumentException('A consulta só pode ler dados (SELECT).');
        }

        if (str_contains($sql, '?')) {
            throw new InvalidArgumentException('Use apenas os parâmetros :ano e :mes.');
        }

        preg_match_all('/:[a-zA-Z_][a-zA-Z0-9_]*/', $sql, $matches);
        $binds = array_values(array_unique($matches[0] ?? []));
        foreach ($binds as $bind) {
            if (! in_array($bind, [':ano', ':mes'], true)) {
                throw new InvalidArgumentException('A consulta só pode usar os parâmetros :ano e :mes.');
            }
        }

        return $sql;
    }
}
