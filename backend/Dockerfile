FROM php:8.4-cli-alpine

RUN apk add --no-cache postgresql-dev libzip-dev unzip mariadb-connector-c-dev \
        openssh-client sshpass openvpn wireguard-tools iproute2 \
        strongswan xl2tpd ppp sudo \
    && docker-php-ext-install pdo_pgsql pdo_mysql zip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
COPY docker/podio-tunel.sudoers /etc/sudoers.d/podio-tunel
RUN chmod 0440 /etc/sudoers.d/podio-tunel

WORKDIR /var/www/html

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
