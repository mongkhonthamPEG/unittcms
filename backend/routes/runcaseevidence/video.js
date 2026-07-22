import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import defineRunCaseEvidence from '../../models/runCaseEvidence.js';
import authMiddleware from '../../middleware/auth.js';
import visibilityMiddleware from '../../middleware/verifyVisible.js';
import { runCaseEvidenceKind } from '../../config/enums.js';

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectVisibleFromRunCaseId } = visibilityMiddleware(sequelize);
  const RunCaseEvidence = defineRunCaseEvidence(sequelize, DataTypes);

  // POST /runcaseevidence/video?runCaseId=X  body: { url }
  router.post('/video', verifySignedIn, verifyProjectVisibleFromRunCaseId, async (req, res) => {
    const runCaseId = req.query.runCaseId;
    const { url } = req.body || {};

    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'url is required' });
    }

    try {
      const created = await RunCaseEvidence.create({
        runCaseId,
        userId: req.userId,
        kind: runCaseEvidenceKind.indexOf('videoLink'),
        url: url.trim(),
      });
      res.json(created);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
