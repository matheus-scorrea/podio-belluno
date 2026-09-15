<?php

namespace App\Support;

use App\Models\User;

final class SenhaTemporaria
{
    private const MAIUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

    private const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz';

    private const DIGITOS = '23456789';

    public static function gerar(int $tamanho = 10): string
    {
        $tamanho = max(8, $tamanho);
        $alfabeto = self::MAIUSCULAS.self::MINUSCULAS.self::DIGITOS;
        $senha = [
            self::caractere(self::MAIUSCULAS),
            self::caractere(self::MINUSCULAS),
            self::caractere(self::DIGITOS),
        ];

        for ($i = 3; $i < $tamanho; $i++) {
            $senha[] = self::caractere($alfabeto);
        }

        for ($i = count($senha) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$senha[$i], $senha[$j]] = [$senha[$j], $senha[$i]];
        }

        return implode('', $senha);
    }

    public static function mensagem(User $user, string $senha): string
    {
        $url = rtrim((string) config('app.frontend_url'), '/');
        $primeiroNome = explode(' ', trim($user->name))[0] ?: $user->name;

        return "Olá, {$primeiroNome}! Seu acesso ao Pódio Belluno está pronto.\n\n"
            ."Entre em: {$url}\n"
            ."E-mail: {$user->email}\n"
            ."Senha temporária: {$senha}\n\n"
            .'No primeiro acesso você cria a sua senha definitiva. Não compartilhe essa senha.';
    }

    /**
     * @return array{senha_temporaria: string, mensagem: string}
     */
    public static function emitir(User $user): array
    {
        $senha = self::gerar();

        $user->update([
            'password' => $senha,
            'must_change_password' => true,
        ]);

        $user->refresh();

        return [
            'senha_temporaria' => $senha,
            'mensagem' => self::mensagem($user, $senha),
        ];
    }

    private static function caractere(string $alfabeto): string
    {
        return $alfabeto[random_int(0, strlen($alfabeto) - 1)];
    }
}
