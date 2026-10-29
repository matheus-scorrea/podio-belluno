<?php

namespace App\Support;

class DwHost
{
    public static function ehSeguro(?string $valor): bool
    {
        $valor = trim((string) $valor);

        return $valor !== '' && (bool) preg_match('/^[A-Za-z0-9][A-Za-z0-9.:_-]*$/', $valor);
    }

    public static function usuarioSeguro(?string $valor): bool
    {
        $valor = trim((string) $valor);

        return $valor !== '' && (bool) preg_match('/^[A-Za-z0-9._-]+$/', $valor);
    }

    public static function usuarioVpn(?string $valor): bool
    {
        $valor = trim((string) $valor);

        return $valor !== '' && (bool) preg_match('/^[A-Za-z0-9.@_+\\\\-]{1,128}$/', $valor);
    }
}
