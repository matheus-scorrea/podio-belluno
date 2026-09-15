<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

final class RegrasSenha
{
    /**
     * @return list<mixed>
     */
    public static function nova(bool $obrigatoria = true): array
    {
        $forca = Password::min(8)->mixedCase()->numbers();

        return $obrigatoria
            ? ['required', 'string', 'confirmed', $forca]
            : ['nullable', 'string', 'confirmed', $forca];
    }
}
