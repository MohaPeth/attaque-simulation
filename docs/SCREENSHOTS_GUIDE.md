# Guide de captures d'écran pour le rapport

> Liste ordonnée des captures à réaliser pour la soutenance / le rapport TP6.
> Les captures vont dans `docs/screenshots/` (créer le dossier).

---

## Préparation

Avant de capturer :

```bash
npm install
npm start
```

Puis ouvrir [http://localhost:3000](http://localhost:3000) dans Chrome / Edge en
**1440 × 900** (DevTools → toolbar > Responsive > 1440 × 900). Pour Windows,
**ShareX** (gratuit) ou **l'outil Capture d'écran** (Win+Shift+S) suffisent.

---

## A — Application légitime (vue utilisateur)

| #     | Fichier                             | Description                                                                                                          |
| ----- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| A.1   | `01-login.png`                      | Page `/` — formulaire de login + comptes de démo. Cliquer une fois sur un compte pour montrer le pré-remplissage.    |
| A.2   | `02-dashboard-employee.png`         | Dashboard après connexion `employee@company.local`. Sidebar à gauche, KPI en haut, bibliothèque + aperçu vide.       |
| A.3   | `03-document-preview.png`           | Cliquer sur **HR_Report.pdf** → l'aperçu affiche le contenu du document à droite.                                    |
| A.4   | `04-upload.png`                     | Onglet **Téléverser** dans la sidebar → formulaire d'upload + liste vide.                                            |
| A.5   | `05-upload-success.png`             | Téléverser n'importe quel fichier (`README.md` par ex.) → message OK + toast vert + fichier listé.                   |
| A.6   | `06-status.png`                     | Onglet **État API** → JSON brut renvoyé par `/api/status`.                                                           |

---

## B — Vue admin (avant attaque)

Se déconnecter, se reconnecter avec **`admin@company.local / admin123`**.

| #     | Fichier                             | Description                                                                                                          |
| ----- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| B.1   | `07-admin-dashboard.png`            | Sidebar avec la nouvelle section **Administration → System Health** visible (uniquement pour le rôle admin).         |
| B.2   | `08-system-health-no-docker.png`    | Page System Health en mode `npm start` (hors Docker) → bandeau rouge « Docker Engine inaccessible ».                 |

---

## C — Démarrage Docker (configuration vulnérable)

```bash
# WSL2 Ubuntu
docker compose up --build
```

Reconnexion en admin et accès à System Health.

| #     | Fichier                             | Description                                                                                                          |
| ----- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| C.1   | `09-docker-compose-up.png`          | Terminal après `docker compose up --build` → service `idp-app` démarré.                                              |
| C.2   | `10-system-health-docker.png`       | Page System Health → KPIs Docker (version, conteneurs, images) + tableau des conteneurs visible.                     |
| C.3   | `11-network-call.png`               | DevTools → Network → réponse JSON de `/api/admin/system` montrant les conteneurs réels de l'hôte.                    |

---

## D — Démonstration de l'attaque (Container Escape)

Tout dans WSL2 / Linux.

| #     | Fichier                             | Description                                                                                                          |
| ----- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| D.1   | `12-exec-into-container.png`        | `docker exec -it idp-app bash` — entrée dans le conteneur applicatif.                                                |
| D.2   | `13-id-root.png`                    | `id` → `uid=0(root) gid=0(root)`.                                                                                    |
| D.3   | `14-ls-docker-sock.png`             | `ls -l /var/run/docker.sock` → socket monté.                                                                         |
| D.4   | `15-docker-ps-from-container.png`   | `docker -H unix:///var/run/docker.sock ps` exécuté depuis le conteneur — preuve qu'on pilote Docker Engine.          |
| D.5   | `16-launch-escape-container.png`    | Commande de lancement du conteneur d'évasion (`alpine chroot /host sh`).                                             |
| D.6   | `17-hostname-escape.png`            | `hostname` retourne le nom de l'**hôte** (≠ celui du conteneur d'origine). Container Escape réussi.                  |
| D.7   | `18-cat-shadow.png`                 | `cat /etc/shadow` → lecture des hashes des mots de passe de l'hôte. Preuve définitive.                               |

---

## E — Configuration durcie (contre-mesures)

```bash
docker compose down
docker compose -f docker-compose.secure.yml up --build
```

| #     | Fichier                             | Description                                                                                                          |
| ----- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| E.1   | `19-secure-up.png`                  | Démarrage avec le compose durci.                                                                                     |
| E.2   | `20-system-health-secure.png`       | System Health en mode durci → bandeau rouge « Docker Engine inaccessible ». La feature est cassée mais l'app sûre.   |
| E.3   | `21-id-non-root.png`                | `docker exec -it idp-app-secure id` → `uid=1000(app)`.                                                               |
| E.4   | `22-no-docker-sock.png`             | `docker exec idp-app-secure ls -l /var/run/docker.sock` → fichier inexistant.                                        |
| E.5   | `23-readonly.png`                   | `docker exec idp-app-secure touch /test` → erreur : *Read-only file system*.                                         |
| E.6   | `24-attack-fails.png`               | Tentative de relancer l'attaque depuis le conteneur durci → échec à chaque étape.                                    |

---

## Astuces pour des captures propres

- **Onglet incognito** pour ne pas avoir d'extensions visibles.
- **Cacher la barre des favoris** : `Ctrl+Maj+B` (Chrome).
- Pour les captures de terminal, utiliser **Windows Terminal** avec la police
  *Cascadia Mono* en taille 14, fond `#0c0c0c`, pour un rendu pro.
- Recadrer pour ne montrer que le contenu utile (pas la barre des tâches).
- Pour annoter les captures (flèches rouges, numéros), utiliser **ShareX** ou
  **Greenshot** (tous deux gratuits sous Windows).
