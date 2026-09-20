# Execution Manager

This directory contains the initial NestJS process scaffold for the DTaaS
Execution Manager. It currently exposes only `GET /health`.

No execution endpoint has been added because its request contract,
responsibilities, and provider boundary have not yet been defined.

## Run locally

```bash
yarn install
yarn build
yarn start
```

## Configuration

Settings come from three places, each overriding the one before it: built-in
defaults, a YAML configuration file, and environment variables.

Copy `manager.yaml.sample` to `manager.yaml` and edit it. The file is located
by the `-c` (or `--config`) option, then `EXECUTION_MANAGER_CONFIG_PATH`, and
otherwise `manager.yaml` in the working directory. Without a file, the defaults
apply.

```bash
yarn start -- -c ./manager.yaml
```

| Setting                  | Default     | Environment variable                       |
| :----------------------- | :---------- | :----------------------------------------- |
| `hostname`               | `127.0.0.1` | `EXECUTION_MANAGER_HOSTNAME`               |
| `port`                   | `4004`      | `EXECUTION_MANAGER_PORT`                   |
| `cors-allow-origin`      | disabled    | `EXECUTION_MANAGER_CORS_ALLOW_ORIGIN`      |
| `cors-allow-credentials` | `false`     | `EXECUTION_MANAGER_CORS_ALLOW_CREDENTIALS` |
| `tls`                    | `false`     | `EXECUTION_MANAGER_TLS`                    |
| `certs`                  | `./certs`   | `EXECUTION_MANAGER_CERTS_DIR`              |

`cors-allow-origin` accepts one origin or a YAML list of origins. Origins
without a scheme are treated as HTTP origins. Set it to `*` to allow any
origin. Credentials may only be enabled when explicit origins are configured,
never with `*`.

### TLS support

Set `tls: true` (or `EXECUTION_MANAGER_TLS=true`) to enable HTTPS.
Certificates are read from the configured certificate directory:

- `<certs>/fullchain.pem`
- `<certs>/privkey.pem`

If either file is missing while TLS is enabled, the service generates a
self-signed RSA-4096/SHA-256 certificate with OpenSSL and stores both files in
the certificate directory. Keep TLS disabled when a reverse proxy terminates
HTTPS for the service.

## `dt-automation` integration status

Version `0.1.0` cannot yet be used as a server-side GitLab adapter through its
published API. Its Node-oriented `createGitlabInstance` factory exists in the
source tree but is not exported from the package root. The exported convenience
initializers read browser `sessionStorage`, and package configuration is supplied
through process-global store registrations.

The Execution Manager therefore does not depend on `dt-automation` yet. The
package needs an explicit server-safe public API before it can be integrated
without importing private source paths or emulating browser state.

