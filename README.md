# Free Proxy Rotator

Tunnel requests through free proxies found online. Proxy quality is low, use with caution.

Proxies found with [proxy-list](https://github.com/chill117/proxy-lists)

```bash
$ docker run -p 1339:1339 jaxgeller/rotating-proxy
$ curl --proxy localhost:1339 http://httpbin.org/ip
```

+ Proxies managed by haproxy, no need to cycle
+ Proxies are rotated every 60 seconds based on ping
+ Runs in docker for easy deploys
