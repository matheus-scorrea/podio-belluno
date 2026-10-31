<?php

namespace App\Support;

use App\Models\DwConexao;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\Process\Process;

class DwTunel
{
    /**
     * @param  list<resource>  $pipes
     */
    public function __construct(
        private string $hostLocal,
        private int $portaLocal,
        private ?Process $processo = null,
        private ?string $diretorio = null,
        private ?string $iface = null,
        private array $pipes = [],
        private $recursoProc = null,
        private bool $parouIpsec = false,
        private ?string $controleL2tp = null,
        private ?string $lacL2tp = null,
        private ?string $ipsecConn = null,
        private ?string $pidXl2tpd = null,
    ) {}

    public static function abrir(DwConexao $conexao): ?self
    {
        if ($conexao->driver === 'sqlite' || ($conexao->acesso ?? 'direto') === 'direto') {
            return null;
        }

        return match ($conexao->acesso) {
            'ssh' => self::abrirSsh($conexao),
            'vpn' => self::abrirVpn($conexao),
            default => throw new InvalidArgumentException('Tipo de acesso de túnel desconhecido.'),
        };
    }

    public function hostLocal(): string
    {
        return $this->hostLocal;
    }

    public function portaLocal(): int
    {
        return $this->portaLocal;
    }

    public function fechar(): void
    {
        if ($this->controleL2tp && $this->lacL2tp) {
            self::escreverControleL2tp($this->controleL2tp, 'd '.$this->lacL2tp);
        }
        self::matarPidFile($this->pidXl2tpd);
        if ($this->recursoProc !== null) {
            foreach ($this->pipes as $pipe) {
                if (is_resource($pipe)) {
                    fclose($pipe);
                }
            }
            $status = proc_get_status($this->recursoProc);
            if (($status['pid'] ?? null) && $status['running']) {
                proc_terminate($this->recursoProc, 15);
            }
            proc_close($this->recursoProc);
            $this->recursoProc = null;
        }
        if ($this->processo?->isRunning()) {
            $this->processo->stop(2, 15);
        }
        if ($this->ipsecConn) {
            self::executarSilencioso(['ipsec', 'down', $this->ipsecConn]);
        }
        if ($this->parouIpsec) {
            self::executarSilencioso(['ipsec', 'stop']);
        }
        if ($this->iface) {
            $this->executarSilencioso(['ip', 'link', 'delete', $this->iface]);
        }
        if ($this->diretorio && is_dir($this->diretorio)) {
            foreach (glob($this->diretorio.'/*') ?: [] as $arquivo) {
                @unlink($arquivo);
            }
            @rmdir($this->diretorio);
        }
    }

    private static function abrirSsh(DwConexao $conexao): self
    {
        self::exigirBinario('ssh', 'openssh-client');
        if (! DwHost::ehSeguro($conexao->ssh_host) || ! DwHost::usuarioSeguro($conexao->ssh_username)) {
            throw new InvalidArgumentException('Host ou usuário SSH inválido.');
        }
        if (! DwHost::ehSeguro($conexao->host)) {
            throw new InvalidArgumentException('Host do banco inválido para o túnel SSH.');
        }

        $dir = self::diretorioTemp();
        $known = $dir.'/known_hosts';
        touch($known);
        chmod($known, 0600);
        $portaLocal = self::portaLivre();
        $cmd = [
            'ssh',
            '-N',
            '-o', 'StrictHostKeyChecking=accept-new',
            '-o', 'UserKnownHostsFile='.$known,
            '-o', 'ExitOnForwardFailure=yes',
            '-o', 'ConnectTimeout=12',
            '-o', 'ServerAliveInterval=5',
            '-o', 'IdentitiesOnly=yes',
            '-p', (string) ($conexao->ssh_port ?: 22),
            '-L', sprintf('127.0.0.1:%d:%s:%d', $portaLocal, $conexao->host, $conexao->port),
            $conexao->ssh_username.'@'.$conexao->ssh_host,
        ];
        $env = [];

        if (($conexao->ssh_auth ?? 'chave') === 'chave') {
            $chave = $conexao->segredoPuro('ssh_chave_privada');
            if ($chave === '') {
                throw new InvalidArgumentException('Informe a chave privada SSH.');
            }
            $keyFile = $dir.'/id';
            file_put_contents($keyFile, $chave);
            chmod($keyFile, 0600);
            array_splice($cmd, 1, 0, ['-i', $keyFile]);
            $pass = $conexao->segredoPuro('ssh_passphrase');
            if ($pass !== '') {
                self::exigirBinario('sshpass', 'sshpass');
                $env['SSHPASS'] = $pass;
                $cmd = array_merge(['sshpass', '-e', '-P', 'passphrase'], $cmd);
            } else {
                array_splice($cmd, 1, 0, ['-o', 'BatchMode=yes']);
            }
        } else {
            $senha = $conexao->segredoPuro('ssh_senha');
            if ($senha === '') {
                throw new InvalidArgumentException('Informe a senha SSH.');
            }
            self::exigirBinario('sshpass', 'sshpass');
            $env['SSHPASS'] = $senha;
            $cmd = array_merge(['sshpass', '-e'], $cmd);
        }

        $proc = self::iniciar($cmd, $env);
        self::esperarPorta($portaLocal, $proc);

        return new self('127.0.0.1', $portaLocal, recursoProc: $proc['resource'], pipes: $proc['pipes'], diretorio: $dir);
    }

    private static function abrirVpn(DwConexao $conexao): self
    {
        $tipo = $conexao->vpn_tipo ?: 'openvpn';
        if (! DwHost::ehSeguro($conexao->host)) {
            throw new InvalidArgumentException('Host do banco inválido para a rota da VPN.');
        }

        $dir = self::diretorioTemp();
        if ($tipo === 'l2tp') {
            return self::abrirL2tp($conexao, $dir);
        }

        $config = $conexao->segredoPuro('vpn_config');
        if ($config === '') {
            throw new InvalidArgumentException('Cole a configuração da VPN.');
        }
        if (! is_dir('/dev/net') || ! file_exists('/dev/net/tun')) {
            throw new RuntimeException('VPN precisa de /dev/net/tun neste servidor (NET_ADMIN no container).');
        }

        return $tipo === 'wireguard'
            ? self::abrirWireguard($conexao, $dir, $config)
            : self::abrirOpenvpn($conexao, $dir, $config);
    }

    private static function abrirOpenvpn(DwConexao $conexao, string $dir, string $config): self
    {
        self::exigirBinario('openvpn', 'openvpn');
        $conf = $dir.'/client.ovpn';
        file_put_contents($conf, $config);
        chmod($conf, 0600);
        $iface = 'pdov'.bin2hex(random_bytes(3));
        $cmd = [
            'openvpn',
            '--config', $conf,
            '--dev', $iface,
            '--dev-type', 'tun',
            '--nobind',
            '--script-security', '1',
            '--route-nopull',
            '--pull-filter', 'ignore', 'redirect-gateway',
            '--pull-filter', 'ignore', 'route',
            '--auth-nocache',
            '--connect-timeout', '15',
            '--verb', '1',
        ];
        $user = trim((string) $conexao->vpn_username);
        $senha = $conexao->segredoPuro('vpn_senha');
        if ($user !== '' || $senha !== '') {
            $auth = $dir.'/auth';
            file_put_contents($auth, $user."\n".$senha."\n");
            chmod($auth, 0600);
            $cmd = array_merge($cmd, ['--auth-user-pass', $auth]);
        }

        $proc = self::iniciar($cmd);
        self::esperarIface($iface, $proc);
        self::rotaHost($conexao->host, $iface);

        return new self($conexao->host, (int) $conexao->port, recursoProc: $proc['resource'], pipes: $proc['pipes'], diretorio: $dir, iface: $iface);
    }

    private static function abrirWireguard(DwConexao $conexao, string $dir, string $config): self
    {
        self::exigirBinario('wg', 'wireguard-tools');
        self::exigirBinario('ip', 'iproute2');
        $parsed = DwVpnWireguard::analisar($config);
        $iface = 'pdwg'.bin2hex(random_bytes(3));
        $priv = $dir.'/priv';
        file_put_contents($priv, $parsed['private_key']."\n");
        chmod($priv, 0600);

        self::executar(['ip', 'link', 'add', $iface, 'type', 'wireguard']);
        $wg = ['wg', 'set', $iface, 'private-key', $priv, 'peer', $parsed['peer_public_key'], 'allowed-ips', $parsed['allowed_ips'], 'endpoint', $parsed['endpoint']];
        if ($parsed['keepalive']) {
            $wg = array_merge($wg, ['persistent-keepalive', (string) $parsed['keepalive']]);
        }
        try {
            self::executar($wg);
            self::executar(['ip', 'address', 'add', $parsed['address'], 'dev', $iface]);
            self::executar(['ip', 'link', 'set', $iface, 'up']);
            self::rotaHost($conexao->host, $iface);
        } catch (\Throwable $e) {
            self::executarSilencioso(['ip', 'link', 'delete', $iface]);
            throw $e;
        }

        return new self($conexao->host, (int) $conexao->port, diretorio: $dir, iface: $iface);
    }

    private static function abrirL2tp(DwConexao $conexao, string $dir): self
    {
        self::exigirBinario('ipsec', 'strongswan');
        self::exigirBinario('xl2tpd', 'xl2tpd');
        self::exigirBinario('ip', 'iproute2');
        if (! file_exists('/dev/ppp')) {
            throw new RuntimeException('L2TP precisa de /dev/ppp neste servidor (módulo ppp_generic e device no container).');
        }

        $servidor = trim((string) $conexao->vpn_servidor);
        $user = trim((string) $conexao->vpn_username);
        $senha = $conexao->segredoPuro('vpn_senha');
        $psk = $conexao->segredoPuro('vpn_psk');
        if (! DwHost::ehSeguro($servidor) || ! DwHost::usuarioVpn($user) || $senha === '' || $psk === '') {
            throw new InvalidArgumentException('Informe servidor, PSK, usuário e senha da VPN L2TP.');
        }
        if (preg_match('/["\\\\\\r\\n]/', $psk.$senha) === 1) {
            throw new InvalidArgumentException('PSK ou senha L2TP contém caracteres inválidos.');
        }

        $id = bin2hex(random_bytes(4));
        $conn = 'pdl2'.$id;
        $lac = 'lac'.$id;
        $confIpsec = $dir.'/ipsec.conf';
        $secrets = $dir.'/ipsec.secrets';
        $xl = $dir.'/xl2tpd.conf';
        $opt = $dir.'/options.xl2tpd';
        $control = $dir.'/l2tp-control';
        $pidfile = $dir.'/xl2tpd.pid';

        file_put_contents($confIpsec, <<<CONF
config setup
    uniqueids=never

conn {$conn}
    auto=add
    keyexchange=ikev1
    leftauth=psk
    rightauth=psk
    type=transport
    left=%defaultroute
    leftprotoport=17/1701
    right={$servidor}
    rightprotoport=17/1701
    ike=aes256-sha1-modp2048,aes128-sha1-modp2048,3des-sha1-modp1024!
    esp=aes256-sha1,aes128-sha1,3des-sha1!
    forceencaps=yes
    dpdaction=clear
    dpddelay=30s
CONF);
        file_put_contents($secrets, ': PSK "'.$psk."\"\n");
        chmod($secrets, 0600);
        file_put_contents($xl, <<<CONF
[global]
access control = no

[lac {$lac}]
lns = {$servidor}
pppoptfile = {$opt}
length bit = yes
require chap = yes
refuse pap = yes
require authentication = yes
name = {$user}
autodial = yes
redial = no
CONF);
        file_put_contents($opt, <<<OPT
ipcp-accept-local
ipcp-accept-remote
refuse-eap
require-mschap-v2
noccp
noauth
idle 1800
mtu 1410
mru 1410
nodefaultroute
nousepeerdns
lock
connect-delay 5000
user "{$user}"
password "{$senha}"
OPT);
        chmod($opt, 0600);

        $antes = self::ifacesPpp();
        $parouIpsec = false;
        try {
            self::executarSilencioso(['ipsec', 'stop']);
            self::executar(['ipsec', 'start', '--conf', $confIpsec]);
            $parouIpsec = true;
            self::executar(['ipsec', 'up', $conn]);
            self::executar(['xl2tpd', '-c', $xl, '-C', $control, '-p', $pidfile]);
            self::executarSilencioso(['chmod', '0644', $pidfile]);
            self::executarSilencioso(['chmod', '0666', $control]);
            $iface = self::esperarPppNova($antes);
            self::rotaHost($conexao->host, $iface);
        } catch (\Throwable $e) {
            self::escreverControleL2tp($control, 'd '.$lac);
            self::matarPidFile($pidfile);
            if ($parouIpsec) {
                self::executarSilencioso(['ipsec', 'down', $conn]);
                self::executarSilencioso(['ipsec', 'stop']);
            }
            foreach (array_diff(self::ifacesPpp(), $antes) as $sobrando) {
                self::executarSilencioso(['ip', 'link', 'delete', $sobrando]);
            }
            throw $e;
        }

        return new self(
            $conexao->host,
            (int) $conexao->port,
            diretorio: $dir,
            iface: $iface,
            parouIpsec: true,
            controleL2tp: $control,
            lacL2tp: $lac,
            ipsecConn: $conn,
            pidXl2tpd: $pidfile,
        );
    }

    private static function rotaHost(string $host, string $iface): void
    {
        $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : gethostbyname($host);
        if (! filter_var($ip, FILTER_VALIDATE_IP)) {
            throw new RuntimeException('Não foi possível resolver o host do banco para a rota da VPN.');
        }
        self::executar(['ip', 'route', 'replace', $ip.'/32', 'dev', $iface]);
    }

    /**
     * @param  list<string>  $cmd
     * @param  array<string, string>  $env
     * @return array{resource: resource, pipes: list<resource>}
     */
    private static function iniciar(array $cmd, array $env = []): array
    {
        $pipes = [];
        $proc = proc_open(self::comRoot($cmd), [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ], $pipes, null, $env === [] ? null : self::ambiente($env));
        if (! is_resource($proc)) {
            throw new RuntimeException('Não foi possível iniciar o túnel.');
        }
        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        return ['resource' => $proc, 'pipes' => $pipes];
    }

    /**
     * @param  array{resource: resource, pipes: list<resource>}  $proc
     */
    private static function esperarPorta(int $porta, array $proc): void
    {
        $inicio = microtime(true);
        while (microtime(true) - $inicio < 15) {
            self::falhouSeMorreu($proc, 'SSH');
            $fp = @fsockopen('127.0.0.1', $porta, $errno, $errstr, 0.2);
            if (is_resource($fp)) {
                fclose($fp);

                return;
            }
            usleep(150000);
        }
        self::matar($proc);
        throw new RuntimeException('Túnel SSH não abriu a porta local a tempo.');
    }

    /**
     * @param  array{resource: resource, pipes: list<resource>}  $proc
     */
    private static function esperarIface(string $iface, array $proc): void
    {
        $inicio = microtime(true);
        while (microtime(true) - $inicio < 20) {
            self::falhouSeMorreu($proc, 'VPN');
            $ip = new Process(['ip', '-o', 'link', 'show', $iface]);
            $ip->run();
            if ($ip->isSuccessful() && trim($ip->getOutput()) !== '') {
                return;
            }
            usleep(200000);
        }
        self::matar($proc);
        throw new RuntimeException('A interface da VPN não subiu a tempo.');
    }

    /**
     * @return list<string>
     */
    private static function ifacesPpp(): array
    {
        $nomes = [];
        foreach (glob('/sys/class/net/ppp*') ?: [] as $path) {
            $nomes[] = basename($path);
        }

        return $nomes;
    }

    /**
     * @param  list<string>  $antes
     */
    private static function esperarPppNova(array $antes): string
    {
        $inicio = microtime(true);
        while (microtime(true) - $inicio < 25) {
            $novas = array_values(array_diff(self::ifacesPpp(), $antes));
            if ($novas !== []) {
                return $novas[0];
            }
            usleep(200000);
        }

        throw new RuntimeException('O túnel L2TP não subiu a tempo.');
    }

    private static function escreverControleL2tp(?string $controle, string $comando): void
    {
        if ($controle === null || $controle === '' || ! file_exists($controle)) {
            return;
        }
        if (preg_match('/^[A-Za-z0-9 ._-]+$/', $comando) !== 1) {
            return;
        }
        try {
            $p = new Process(self::comRoot(['tee', $controle]));
            $p->setTimeout(2);
            $p->setInput($comando."\n");
            $p->run();
        } catch (\Throwable) {
        }
    }

    private static function matarPidFile(?string $pidfile): void
    {
        if ($pidfile === null || ! is_file($pidfile)) {
            return;
        }
        $pid = (int) trim((string) file_get_contents($pidfile));
        if ($pid > 1) {
            self::executarSilencioso(['kill', '-TERM', (string) $pid]);
        }
        @unlink($pidfile);
    }

    /**
     * @param  array{resource: resource, pipes: list<resource>}  $proc
     */
    private static function falhouSeMorreu(array $proc, string $rotulo): void
    {
        $status = proc_get_status($proc['resource']);
        if ($status['running']) {
            return;
        }
        $err = stream_get_contents($proc['pipes'][2]) ?: stream_get_contents($proc['pipes'][1]) ?: '';
        proc_close($proc['resource']);
        throw new RuntimeException(trim($rotulo.' falhou. '.mb_substr($err, 0, 300)));
    }

    /**
     * @param  array{resource: resource, pipes: list<resource>}  $proc
     */
    private static function matar(array $proc): void
    {
        proc_terminate($proc['resource'], 15);
        proc_close($proc['resource']);
    }

    /**
     * @param  list<string>  $cmd
     */
    private static function executar(array $cmd): void
    {
        $p = new Process(self::comRoot($cmd));
        $p->setTimeout(20);
        $p->run();
        if (! $p->isSuccessful()) {
            throw new RuntimeException(trim($p->getErrorOutput().' '.$p->getOutput()) ?: 'Falha ao configurar o túnel.');
        }
    }

    /**
     * @param  list<string>  $cmd
     * @return list<string>
     */
    private static function comRoot(array $cmd): array
    {
        $bin = $cmd[0] ?? '';
        if (! in_array($bin, ['ipsec', 'xl2tpd', 'ip', 'wg', 'openvpn', 'kill', 'tee', 'chmod'], true)) {
            return $cmd;
        }
        if (function_exists('posix_geteuid') && posix_geteuid() === 0) {
            return $cmd;
        }
        self::exigirBinario('sudo', 'sudo');

        return array_merge(['sudo', '-n'], $cmd);
    }

    /**
     * @param  list<string>  $cmd
     */
    private static function executarSilencioso(array $cmd): void
    {
        try {
            self::executar($cmd);
        } catch (\Throwable) {
        }
    }

    private static function exigirBinario(string $bin, string $pacote): void
    {
        $p = new Process(['sh', '-c', 'command -v '.escapeshellarg($bin)]);
        $p->run();
        if (! $p->isSuccessful()) {
            throw new RuntimeException("Instale {$pacote} na imagem para usar este túnel.");
        }
    }

    /**
     * @param  array<string, string>  $extra
     * @return array<string, string>
     */
    private static function ambiente(array $extra): array
    {
        $base = [];
        foreach ($_ENV + $_SERVER as $chave => $valor) {
            if (is_string($chave) && is_string($valor) && preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $chave) === 1) {
                $base[$chave] = $valor;
            }
        }

        return $extra + $base;
    }

    private static function diretorioTemp(): string
    {
        $dir = sys_get_temp_dir().'/podio-tunel-'.bin2hex(random_bytes(8));
        if (! mkdir($dir, 0700) && ! is_dir($dir)) {
            throw new RuntimeException('Não foi possível criar o diretório temporário do túnel.');
        }

        return $dir;
    }

    private static function portaLivre(): int
    {
        $sock = stream_socket_server('tcp://127.0.0.1:0', $errno, $errstr);
        if ($sock === false) {
            throw new RuntimeException('Não foi possível reservar uma porta local para o SSH.');
        }
        $nome = stream_socket_get_name($sock, false) ?: '';
        fclose($sock);
        $porta = (int) substr($nome, strrpos($nome, ':') + 1);
        if ($porta < 1) {
            throw new RuntimeException('Porta local SSH inválida.');
        }

        return $porta;
    }
}
