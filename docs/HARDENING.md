# Contre-mesures et bonnes pratiques (Docker Hardening)

Ce document liste les mesures permettant d'éviter le scénario décrit dans
[`ATTACK_SCENARIO.md`](ATTACK_SCENARIO.md).

---

## 1. Ne pas exposer `/var/run/docker.sock`

**C'est la mesure n°1.** Monter le socket Docker dans un conteneur revient à
donner un accès root à l'hôte.

| Mauvaise pratique                                      | Bonne pratique                                            |
| ------------------------------------------------------ | --------------------------------------------------------- |
| `-v /var/run/docker.sock:/var/run/docker.sock`         | NE PAS le monter                                          |
| Conteneurs CI qui « build leurs voisins »              | Utiliser **Kaniko**, **BuildKit rootless**, **buildah**   |
| Outils internes qui pilotent Docker                    | API distante TLS + RBAC, ou orchestrateur (Kubernetes)    |

Si vous avez **réellement** besoin de piloter Docker depuis un conteneur :

- exposer un proxy filtré (**docker-socket-proxy** : Tecnativa) ;
- limiter aux endpoints en lecture seule ;
- ne JAMAIS l'exposer à des conteneurs accessibles par l'extérieur.

---

## 2. Ne pas tourner en root dans le conteneur

Dans le `Dockerfile` :

```dockerfile
RUN groupadd -r app && useradd -r -g app -u 1000 app
USER 1000:1000
```

Dans le `docker-compose.yml` :

```yaml
user: "1000:1000"
```

Vérification :

```bash
docker exec idp-app-secure id
# uid=1000(app) gid=1000(app)
```

---

## 3. Filesystem en lecture seule

```yaml
read_only: true
tmpfs:
  - /tmp
```

Empêche l'attaquant d'écrire des binaires, des cron jobs, etc.

---

## 4. Drop des capabilities Linux

```yaml
cap_drop:
  - ALL
security_opt:
  - no-new-privileges:true
```

`no-new-privileges` empêche l'élévation de privilèges via SUID, et
`cap_drop: ALL` retire toutes les capacités Linux du conteneur.

Si l'application a besoin d'écouter sur un port < 1024, on peut ajouter
sélectivement :

```yaml
cap_add:
  - NET_BIND_SERVICE
```

---

## 5. Limites de ressources

```yaml
mem_limit: 256m
cpus: 0.5
pids_limit: 100
```

Empêche un conteneur compromis de DoS l'hôte.

---

## 6. Mode rootless Docker (côté hôte)

Sur l'hôte (machine WSL2 / Linux) :

```bash
dockerd-rootless-setuptool.sh install
export DOCKER_HOST=unix:///run/user/1000/docker.sock
```

En **rootless**, même si `/var/run/docker.sock` venait à fuiter, l'attaquant
n'obtiendrait pas root sur l'hôte, mais seulement les droits de l'utilisateur
qui a démarré le démon Docker.

---

## 7. Profils AppArmor / seccomp

Docker active par défaut un profil **seccomp** qui bloque ~44 syscalls
dangereux. Vérifier qu'il n'a pas été désactivé :

```yaml
security_opt:
  - seccomp:default
  - apparmor:docker-default
```

À NE PAS faire :

```yaml
security_opt:
  - seccomp:unconfined          # ❌ retire la protection
  - apparmor:unconfined         # ❌ retire la protection
privileged: true                # ❌ équivaut à donner root sur l'hôte
```

---

## 8. Scan d'image

À intégrer dans la CI :

```bash
trivy image internal-document-portal:hardened
grype  internal-document-portal:hardened
docker scout quickview internal-document-portal:hardened
```

Objectif : zéro CVE *Critical* / *High* avant publication.

---

## 9. Segmentation réseau

```yaml
networks:
  idp-net:
    driver: bridge
    internal: true       # pas d'accès Internet sortant
```

Et **ne pas** publier de port inutile (`ports:` à minimiser).

---

## 10. Principe du moindre privilège applicatif

Au-delà du conteneur :

- l'utilisateur applicatif ne doit pas avoir un compte admin SQL ;
- les secrets doivent être injectés via `docker secret` / `Vault`, pas en clair
  dans les variables d'environnement ;
- les uploads doivent être stockés dans un volume dédié, sans exécution
  (`noexec`, `nosuid`).

---

## 11. Récapitulatif comparatif

| Élément                              | `docker-compose.yml` (vulnérable) | `docker-compose.secure.yml` (durci) |
| ------------------------------------ | --------------------------------- | ----------------------------------- |
| `/var/run/docker.sock` monté ?       | OUI ❌                             | NON ✅                               |
| Utilisateur                          | root (uid 0) ❌                    | uid 1000 ✅                          |
| Filesystem                           | read-write ❌                      | read-only ✅                         |
| Capabilities                         | défaut ❌                          | `cap_drop: ALL` ✅                   |
| `no-new-privileges`                  | non                               | oui ✅                               |
| Limites CPU / mémoire                | aucune                            | 0.5 CPU / 256 MB ✅                  |
| Container Escape possible ?          | OUI ❌                             | NON ✅                               |

---

## 12. Pour aller plus loin

- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [OWASP Docker Top 10](https://owasp.org/www-project-docker-top-10/)
- [Docker Security Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- `docker scan`, `trivy`, `grype`, `docker scout`
- Kubernetes : `PodSecurityStandards`, `NetworkPolicies`, `seccompProfile`
