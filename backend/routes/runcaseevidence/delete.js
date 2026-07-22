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

  // DELETE /runcaseevidence/:evidenceId?runCaseId=X
  router.delete('/:evidenceId', verifySignedIn, verifyProjectVisibleFromRunCaseId, async (req, res) => {
    const evidenceId = req.params.evidenceId;
    const runCaseId = req.query.runCaseId;
    const t = await sequelize.transaction();

    try {
      const evidence = await RunCaseEvidence.findByPk(evidenceId, { transaction: t });
      if (!evidence || String(evidence.runCaseId) !== String(runCaseId)) {
        await t.rollback();
        return res.status(404).send('Evidence not found');
      }

      if (evidence.filename) {
        const filePath = path.join(__dirname, '../../public/uploads', evidence.filename);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error deleting file:', err);
          }
        });
      }

      await evidence.destroy({ transaction: t });
      await t.commit();
      res.status(204).send();
    } catch (error) {
      console.error(error);
      await t.rollback();
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
