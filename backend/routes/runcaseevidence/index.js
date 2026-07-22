import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import defineRunCaseEvidence from '../../models/runCaseEvidence.js';
import authMiddleware from '../../middleware/auth.js';
import visibilityMiddleware from '../../middleware/verifyVisible.js';

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectVisibleFromRunCaseId } = visibilityMiddleware(sequelize);
  const RunCaseEvidence = defineRunCaseEvidence(sequelize, DataTypes);

  router.get('/', verifySignedIn, verifyProjectVisibleFromRunCaseId, async (req, res) => {
    const runCaseId = req.query.runCaseId;

    try {
      const evidence = await RunCaseEvidence.findAll({
        where: { runCaseId },
        order: [['createdAt', 'ASC']],
      });
      res.json(evidence);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
