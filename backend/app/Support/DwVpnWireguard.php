<?php

namespace App\Support;

use InvalidArgumentException;

class DwVpnWireguard
{
    /**
     * @return array{private_key: string, address: string, peer_public_key: string, endpoint: string, allowed_ips: string, keepalive: int|null}
     */
    public static function analisar(string $config): array
    {
        $proibido = ['postup', 'preup', 'postdown', 'predown', 'predown', 'table', 'fwmark', 'saveconfig'];
        $interface = [];
        $peer = [];
        $secao = null;

        foreach (preg_split('/\R/', $config) ?: [] as $linha) {
            $linha = trim($linha);
            if ($linha === '' || str_starts_with($linha, '#')) {
                continue;
            }
            if (preg_match('/^\[(.+)\]$/', $linha, $m) === 1) {
                $secao = strtolower($m[1]);
                if (! in_array($secao, ['interface', 'peer'], true)) {
                    throw new InvalidArgumentException('Configuração WireGuard só aceita [Interface] e [Peer].');
                }
                continue;
            }
            if (! str_contains($linha, '=')) {
                throw new InvalidArgumentException('Linha inválida no WireGuard.');
            }
            [$chave, $valor] = array_map('trim', explode('=', $linha, 2));
            $chaveNorm = strtolower(str_replace(' ', '', $chave));
            if (in_array($chaveNorm, $proibido, true)) {
                throw new InvalidArgumentException("Diretiva WireGuard não permitida: {$chave}.");
            }
            if ($secao === 'interface') {
                $interface[$chaveNorm] = $valor;
            } elseif ($secao === 'peer') {
                $peer[$chaveNorm] = $valor;
            }
        }

        $private = $interface['privatekey'] ?? '';
        $address = explode(',', $interface['address'] ?? '')[0] ?? '';
        $public = $peer['publickey'] ?? '';
        $endpoint = $peer['endpoint'] ?? '';
        $allowed = $peer['allowedips'] ?? '0.0.0.0/0';
        $keepalive = isset($peer['persistentkeepalive']) ? (int) $peer['persistentkeepalive'] : null;

        if ($private === '' || $address === '' || $public === '' || $endpoint === '') {
            throw new InvalidArgumentException('WireGuard precisa de PrivateKey, Address, PublicKey e Endpoint.');
        }
        if (! str_contains($address, '/')) {
            $address .= '/32';
        }

        return [
            'private_key' => $private,
            'address' => $address,
            'peer_public_key' => $public,
            'endpoint' => $endpoint,
            'allowed_ips' => $allowed,
            'keepalive' => $keepalive && $keepalive > 0 ? $keepalive : null,
        ];
    }
}
