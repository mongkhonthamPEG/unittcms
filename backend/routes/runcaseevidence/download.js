import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import defineRunCaseEvidence from '../../models/runCaseEvidence.js';
import authMiddleware from '../../middleware/auth.js';
import visibilityMiddleware from '../../middleware/verifyVisible.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectVisibleFromRunCaseId } = visibilityMiddleware(sequelize);
  const RunCaseEvidence = defineRunCaseEvidence(sequelize, DataTypes);

  // GET /runcaseevidence/download/:evidenceId?runCaseId=X
  router.get(
    '/download/:evidenceId',
    verifySignedIn,
    verifyProjectVisibleFromRunCaseId,
    async (req, res) => {
      const evidenceId = req.params.evidenceId;
      const runCaseId = req.query.runCaseId;

      try {
        const evidence = await RunCaseEvidence.findByPk(evidenceId);
        if (!evidence || String(evidence.runCaseId) !== String(runCaseId) || !evidence.filename) {
          return res.status(404).send('Evidence not found');
        }

        const filePath = path.join(__dirname, '../../public/uploads', evidence.filename);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'File not found' });
        }

        res.download(filePath, evidence.title || evidence.filename);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    },
  );

  return router;
}
