const ProxyLists = require('proxy-lists');
const ip = require('ip');
const { promisify } = require('util');
const writeFile = promisify(require('fs').writeFile);
const readFile = promisify(require('fs').readFile);
const exec = promisify(require('child_process').exec);

const PROXY_OPTIONS = {
  countries: ['us'],
  sourcesBlackList: ['kingproxies', 'bitproxies']
};

const CWD = process.cwd()
const PORT = process.env.PORT || 1339
const REFRESH_RATE = process.env.REFRESH_RATE || 60

const PID_FILE = `${CWD}/ha.pid`;
const CFG_FILE = `${CWD}/haproxy.cfg`;
const HAPROXY_CMD = 'haproxy';

function renderProxies(proxies) {
  return proxies
    .filter(proxy => proxy !== undefined)
    .map((proxy, i) => `  server proxy${i} ${proxy.trim()}`) // intentional 2 spaces
    .join('\n');
}

function getConfig(proxies) {
  return `
global
  maxconn 1024
  pidfile ha.pid
  daemon

defaults
  mode http
  maxconn 1024
  option  httplog
  option  dontlognull
  retries 1
  timeout connect 5s
  timeout client 20s
  timeout server 20s

frontend localnodes
  bind *:${PORT}
  mode http
  default_backend proxies

backend proxies
  balance roundrobin
  option http_proxy
${renderProxies(proxies)}
`;
}

function getProxyList() {
  let proxyList = {};
  return new Promise((resolve, reject) => {
    ProxyLists.getProxies(PROXY_OPTIONS)
      .on('data', proxies => {
        proxies.forEach(proxy => {
          if (!ip.isV4Format(proxy.ipAddress)) return;
          if (proxy.port < 80) return;
          if (proxy.port === PORT) return;

          const el = `${proxy.ipAddress}:${proxy.port}`;

          proxyList[el] = 0; // if i figure out a good way to ping in node, ping server here
        });
      })
      .on('end', () => {resolve(proxyList)})
      .on('error', err => {
        console.log(err)
        reject(err)
      });
  });
}

function sortProxiesByPing(proxies) {
  return Object.keys(proxies).sort((a, b) => proxies[a] - proxies[b]);
}

function getHaproxyPID() {
  return readFile(`${PID_FILE}`);
}

function startHaproxy() {
  console.log('launching haproxy');
  return exec(`${HAPROXY_CMD} -f ${CFG_FILE}`);
}

function reloadHaproxy() {
  console.log('reloading haproxy');
  return exec(`${HAPROXY_CMD} -sf $(cat ${PID_FILE}) -f ${CFG_FILE}`);
}

function killHaproxy() {
  console.log('killing existing haproxy');
  return exec(`kill -9 $(cat ${PID_FILE}) 2>/dev/null`);
}

function saveHaproxyConfig(config) {
  return writeFile(`${CFG_FILE}`, config);
}

async function getAndSaveProxyList() {
  console.log('fetching proxies');
  const proxyList = await getProxyList();
  const keys = Object.keys(proxyList);
  const config = getConfig(keys.slice(0, 4095)); // haproxy max servers

  await saveHaproxyConfig(config);
}

function tick() {
  setTimeout(async () => {
    try {
      await getAndSaveProxyList();
      await reloadHaproxy();
    } catch (e) {
      console.warn(e);
    }

    return tick();
  }, REFRESH_RATE * 1000);
}

async function main() {
  try {
    await getAndSaveProxyList();
    await startHaproxy();
  } catch (e) {
    console.warn(e);
  }

  tick();
}

main();
