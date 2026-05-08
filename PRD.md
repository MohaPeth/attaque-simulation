# PRD COMPLET

# Projet : Internal Document Portal

## Sujet 6 : Sécurité des conteneurs, Évasion Docker (Container Escape)

---

# 1. Présentation Générale du Projet

## Nom du projet

# **Internal Document Portal (IDP)**

---

## Contexte

Dans les environnements DevOps modernes, les entreprises utilisent massivement Docker afin de :

- accélérer les déploiements ;
- standardiser les environnements ;
- simplifier la maintenance ;
- améliorer la scalabilité des applications.

Cependant, certaines mauvaises pratiques de configuration peuvent transformer un conteneur Docker en point d’entrée critique vers l’infrastructure hôte.

Le projet **Internal Document Portal** simule une plateforme interne d’entreprise permettant :

- l’authentification des employés ;
- l’accès à des documents internes ;
- la consultation de fichiers confidentiels ;
- l’upload de documents.

L’application est volontairement déployée avec une mauvaise configuration Docker afin de démontrer une attaque de type :

# Container Escape.

---

# 2. Objectif du Projet

Le projet a pour objectif de :

- comprendre le fonctionnement des conteneurs Docker ;
- analyser l’isolation des conteneurs ;
- démontrer les risques liés aux mauvaises configurations ;
- exploiter une mauvaise pratique DevOps ;
- simuler une compromission de l’environnement hôte ;
- proposer des contre-mesures de sécurisation.

---

# 3. Problématique

## Question principale

> Comment une mauvaise configuration Docker peut-elle permettre à un attaquant de compromettre l’environnement hôte depuis un conteneur applicatif ?

---

# 4. Architecture Générale

```text id="m4b4zd"
Employé
   ↓
Internal Document Portal
(Node.js + Express)
   ↓
Docker Container
   ↓
Docker Socket exposé
(/var/run/docker.sock)
   ↓
Docker Engine
   ↓
Machine Hôte
```

---

# 5. Périmètre du Projet

## Inclus

- Développement d’une API REST ;
- Authentification simple ;
- Gestion de documents ;
- Dockerisation complète ;
- Déploiement via Docker Compose ;
- Vulnérabilité volontaire ;
- Démonstration d’évasion Docker ;
- Contre-mesures de sécurité.

---

## Exclu

- Infrastructure Cloud réelle ;
- Kubernetes ;
- Exploitation Kernel avancée ;
- Authentification MFA réelle ;
- Frontend complexe React/Vue ;
- Active Directory réel.

---

# 6. Stack Technique

| Élément             | Technologie                 |
| ------------------- | --------------------------- |
| Backend             | Node.js                     |
| Framework           | Express.js                  |
| Frontend            | HTML/CSS simple             |
| Base de données     | JSON / SQLite               |
| Conteneurisation    | Docker                      |
| Orchestration       | Docker Compose              |
| Tests API           | Postman                     |
| Système             | Windows 11 + Docker Desktop |
| Environnement Linux | WSL2 Ubuntu                 |

---

# 7. Fonctionnalités Métier

## 7.1 Authentification

### Description

Permettre aux employés de se connecter au portail.

### Endpoint

```http id="uvlyc4"
POST /api/login
```

### Données attendues

```json id="r2i7o9"
{
  "email": "employee@company.local",
  "password": "password123"
}
```

### Réponse

```json id="z2qu3j"
{
  "token": "fake-jwt-token"
}
```

---

# 7.2 Consultation des documents

### Description

Afficher la liste des documents internes.

### Endpoint

```http id="qv4qyw"
GET /api/files
```

### Réponse

```json id="v9b9fc"
[
  {
    "id": 1,
    "name": "HR_Report.pdf"
  },
  {
    "id": 2,
    "name": "Confidential_Strategy.docx"
  }
]
```

---

# 7.3 Lecture d’un document

### Endpoint

```http id="jlwm0u"
GET /api/files/:id
```

---

# 7.4 Upload de documents

### Endpoint

```http id="x3tk9l"
POST /api/upload
```

### Fonction

Permettre le dépôt de documents internes.

---

# 7.5 Vérification état API

### Endpoint

```http id="4mw6pr"
GET /api/status
```

### Réponse

```json id="a3dr1z"
{
  "status": "API running",
  "project": "Internal Document Portal"
}
```

---

# 8. Architecture Docker

---

# 8.1 Dockerfile

## Objectif

Créer une image conteneurisée de l’application.

### Contenu prévu

- image Node.js ;
- installation dépendances ;
- copie application ;
- exposition port ;
- démarrage API.

---

# 8.2 Docker Compose

## Objectif

Orchestration simplifiée du projet.

### Services

| Service                  | Description    |
| ------------------------ | -------------- |
| internal-document-portal | API principale |

---

# 8.3 Vulnérabilité Volontaire

## Configuration dangereuse

```yaml id="s8b2x1"
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

---

## Risque

Cette configuration permet au conteneur :

- d’interagir avec Docker Engine ;
- de créer des conteneurs ;
- de monter des volumes ;
- d’accéder potentiellement à la machine hôte.

---

# 9. Scénario d’Attaque

---

# Phase 1 : Application légitime

L’utilisateur accède normalement au portail documentaire.

---

# Phase 2 : Compromission

L’attaquant obtient un shell dans le conteneur applicatif.

---

# Phase 3 : Découverte

L’attaquant identifie :

```bash id="eq4gg8"
/var/run/docker.sock
```

---

# Phase 4 : Exploitation

Utilisation du socket Docker afin de :

- créer un nouveau conteneur ;
- monter le système hôte ;
- obtenir des privilèges étendus.

---

# Phase 5 : Container Escape

Accès :

- aux fichiers hôte ;
- aux volumes système ;
- à l’environnement Docker.

---

# 10. Risques Étudiés

| Risque                | Impact                 |
| --------------------- | ---------------------- |
| Docker socket exposé  | Contrôle Docker Engine |
| Conteneur root        | Escalade privilèges    |
| Mauvaise isolation    | Compromission hôte     |
| Vol documents         | Fuite données          |
| Mauvaise segmentation | Mouvement latéral      |

---

# 11. Contre-Mesures

## Mesures de sécurisation étudiées

- suppression du montage docker.sock ;
- rootless Docker ;
- limitation des privilèges ;
- AppArmor ;
- seccomp ;
- scan des images ;
- séparation des rôles ;
- principe du moindre privilège ;
- segmentation réseau.

---

# 12. Livrables Attendus

Le projet devra fournir :

## Code source

- API Node.js ;
- fichiers Docker ;
- structure projet.

---

## Démonstration

- lancement Docker ;
- accès application ;
- exploitation sécurité ;
- container escape.

---

## Documentation

- rapport technique ;
- captures d’écran ;
- architecture ;
- analyse sécurité.

---

## Présentation

- PowerPoint ;
- démonstration live ;
- explication architecture ;
- recommandations sécurité.

---

# 13. Répartition des Tâches

| Membre         | Rôle                                          |
| -------------- | --------------------------------------------- |
| Toi            | Architecture, sécurité, Docker, démonstration |
| Dev partenaire | Backend API, endpoints, interface légère      |

---

# 14. Planning Prévisionnel

| Étape   | Objectif                    |
| ------- | --------------------------- |
| Phase 1 | Structure projet            |
| Phase 2 | Développement API           |
| Phase 3 | Dockerisation               |
| Phase 4 | Démonstration vulnérabilité |
| Phase 5 | Exploitation                |
| Phase 6 | Captures                    |
| Phase 7 | Rapport                     |
| Phase 8 | Soutenance                  |

---

# 15. Résultat Final Attendu

À la fin du projet, le groupe devra être capable de :

- expliquer le fonctionnement Docker ;
- démontrer une mauvaise pratique DevOps ;
- réaliser une attaque de type Container Escape ;
- analyser les impacts sécurité ;
- proposer des mesures de hardening Docker.

---

# 16. Conclusion

Le projet Internal Document Portal met en évidence les risques liés aux mauvaises pratiques de conteneurisation dans les environnements DevOps modernes.

À travers une démonstration pratique, le projet illustre comment une simple erreur de configuration peut compromettre l’ensemble de l’infrastructure hôte.

Ce travail permet également d’aborder les notions :

- d’isolation ;
- de sécurité cloud-native ;
- de DevSecOps ;
- de hardening Docker ;
- et de gestion des privilèges.
