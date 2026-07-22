import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import express from 'express';
const router = express.Router();
import { DataTypes } from 'sequelize';
import defineRunCaseEvidence from '../../models/runCaseEvidence.js';
import authMiddleware from '../../middleware/auth.js';
import visibilityMiddleware from '../../middleware/verifyVisible.js';
import { runCaseEvidenceKind } from '../../config/enums.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (sequelize) {
  const { verifySignedIn } = authMiddleware(sequelize);
  const { verifyProjectVisibleFromRunCaseId } = visibilityMiddleware(sequelize);
  const RunCaseEvidence = defineRunCaseEvidence(sequelize, DataTypes);

  // Reuses the same upload directory as /attachments
  const uploadDir = path.join(__dirname, '../../public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      let fileName = `${baseName}${ext}`;

      let fileExists = true;
      let fileIndex = 1;
      while (fileExists) {
        const filePath = path.join(uploadDir, fileName);
        if (fs.existsSync(filePath)) {
          fileName = `${baseName}_${fileIndex}${ext}`;
          fileIndex++;
        } else {
          fileExists = false;
        }
      }

      cb(null, fileName);
    },
  });

  const upload = multer({ storage });

  // POST /runcaseevidence/screenshot?runCaseId=X
  router.post(
    '/screenshot',
    verifySignedIn,
    verifyProjectVisibleFromRunCaseId,
    upload.array('files', 10),
    async (req, res) => {
      const runCaseId = req.query.runCaseId;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const t = await sequelize.transaction();
      try {
        const evidenceData = files.map((file) => ({
          runCaseId,
          userId: req.userId,
          kind: runCaseEvidenceKind.indexOf('screenshot'),
          filename: file.filename,
          title: file.originalname,
        }));

        const created = await RunCaseEvidence.bulkCreate(evidenceData, { transaction: t });
        await t.commit();
        res.json(created);
      } catch (error) {
        console.error(error);
        await t.rollback();
        res.status(500).send('Internal Server Error');
      }
    },
  );

  return router;
}
