// =============================================================
// /api/admin/system  —  feature "System Health" (admin only)
//
// /!\ EXEMPLE PEDAGOGIQUE DE MAUVAISE PRATIQUE /!\
//
// Cette route interroge directement le DOCKER ENGINE de l'hote
// via le socket UNIX /var/run/docker.sock pour afficher aux
// administrateurs l'etat des conteneurs.
//
// Cette implementation est volontairement vulnerable :
// pour fonctionner en prod, elle requiert que l'app monte
// /var/run/docker.sock dans le conteneur => CONTAINER ESCAPE
// possible si l'attaquant compromet l'application.
//
// La bonne pratique (voir docs/HARDENING.md) est d'utiliser
// un PROXY filtrant (docker-socket-proxy) ou de remonter
// les metriques via Prometheus/cAdvisor — JAMAIS le socket brut.
// =============================================================

const express = require('express');
const http = require('http');
const fs = require('fs');
const os = require('os');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const DOCKER_SOCK = '/var/run/docker.sock';

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acces reserve aux administrateurs' });
  }
  next();
}

function dockerRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: DOCKER_SOCK, path, method: 'GET' },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Reponse Docker invalide'));
            }
          } else {
            reject(new Error(`Docker API ${res.statusCode}: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(2000, () => {
      req.destroy(new Error('Timeout Docker socket'));
    });
    req.end();
  });
}

router.get('/admin/system', requireAuth, requireAdmin, async (_req, res) => {
  const result = {
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memTotalMb: Math.round(os.totalmem() / (1024 * 1024)),
      memFreeMb: Math.round(os.freemem() / (1024 * 1024)),
      uptimeSec: Math.round(os.uptime()),
      nodeVersion: process.version,
    },
    docker: {
      available: false,
      reason: null,
      info: null,
      containers: [],
      images: [],
    },
  };

  if (!fs.existsSync(DOCKER_SOCK)) {
    result.docker.reason = `Socket Docker introuvable (${DOCKER_SOCK}). En production, l app n est pas connectee au Docker Engine.`;
    return res.json(result);
  }

  try {
    const [info, containers, images] = await Promise.all([
      dockerRequest('/info'),
      dockerRequest('/containers/json?all=true'),
      dockerRequest('/images/json'),
    ]);

    result.docker.available = true;
    result.docker.info = {
      serverVersion: info.ServerVersion,
      containers: info.Containers,
      containersRunning: info.ContainersRunning,
      containersStopped: info.ContainersStopped,
      images: info.Images,
      kernelVersion: info.KernelVersion,
      operatingSystem: info.OperatingSystem,
    };
    result.docker.containers = containers.map((c) => ({
      id: c.Id.slice(0, 12),
      name: (c.Names && c.Names[0] && c.Names[0].replace(/^\//, '')) || c.Id.slice(0, 12),
      image: c.Image,
      state: c.State,
      status: c.Status,
      created: c.Created,
    }));
    result.docker.images = images.slice(0, 20).map((img) => ({
      id: img.Id.replace('sha256:', '').slice(0, 12),
      tags: img.RepoTags || [],
      sizeMb: Math.round((img.Size || 0) / (1024 * 1024)),
    }));
  } catch (err) {
    result.docker.reason = `Impossible de joindre Docker Engine : ${err.message}`;
  }

  res.json(result);
});

module.exports = router;
