FROM node:8.5.0

WORKDIR /usr/src/app

ENV HAPROXY_MAJOR 1.7
ENV HAPROXY_VERSION 1.7.9
ENV HAPROXY_MD5 a2bbbdd45ffe18d99cdcf26aa992f92d

# copied from https://github.com/docker-library/haproxy/blob/394255fbe76c57a9f2e0775e3e69df714e801b46/1.7/Dockerfile
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libpcre3 \
    libssl1.0.0 \
  && rm -rf /var/lib/apt/lists/*

RUN set -x \
  \
  && buildDeps=' \
    gcc \
    libc6-dev \
    libpcre3-dev \
    libssl-dev \
    make \
    wget \
  ' \
  && apt-get update && apt-get install -y $buildDeps --no-install-recommends && rm -rf /var/lib/apt/lists/* \
  \
  && wget -O haproxy.tar.gz "http://www.haproxy.org/download/${HAPROXY_MAJOR}/src/haproxy-${HAPROXY_VERSION}.tar.gz" \
  && echo "$HAPROXY_MD5 *haproxy.tar.gz" | md5sum -c \
  && mkdir -p /usr/src/haproxy \
  && tar -xzf haproxy.tar.gz -C /usr/src/haproxy --strip-components=1 \
  && rm haproxy.tar.gz \
  \
  && makeOpts=' \
    TARGET=linux2628 \
    USE_OPENSSL=1 \
    USE_PCRE=1 PCREDIR= \
    USE_ZLIB=1 \
  ' \
  && make -C /usr/src/haproxy -j "$(nproc)" all $makeOpts \
  && make -C /usr/src/haproxy install-bin $makeOpts \
  \
  && mkdir -p /usr/local/etc/haproxy \
  && cp -R /usr/src/haproxy/examples/errorfiles /usr/local/etc/haproxy/errors \
  && rm -rf /usr/src/haproxy \
  \
  && apt-get purge -y --auto-remove $buildDeps


COPY package.json .
RUN npm install

COPY . .

EXPOSE 1339
CMD [ "npm", "start" ]
