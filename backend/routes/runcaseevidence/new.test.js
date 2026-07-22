import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Sequelize } from 'sequelize';
import runCaseEvidenceNewRoute from './new.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../public/uploads');

vi.mock('../../middleware/auth.js', () => ({
  default: () => ({
    verifySignedIn: vi.fn((req, res, next) => {
      req.userId = 1;
      next();
    }),
  }),
}));

vi.mock('../../middleware/verifyVisible.js', () => ({
  default: () => ({
    verifyProjectVisibleFromRunCaseId: vi.fn((req, res, next) => next()),
  }),
}));

const mockRunCaseEvidence = {
  bulkCreate: vi.fn(),
};
vi.mock('../../models/runCaseEvidence.js', () => ({
  default: () => mockRunCaseEvidence,
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });
  sequelize.transaction = vi.fn(async () => ({ commit: vi.fn(), rollback: vi.fn() }));
  app.use('/runcaseevidence', runCaseEvidenceNewRoute(sequelize));
  return app;
}

describe('POST /runcaseevidence/screenshot', () => {
  let app;
  const uploadedFilenames = [];

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
    uploadedFilenames.length = 0;
  });

  afterEach(() => {
    for (const name of uploadedFilenames) {
      const filePath = path.join(uploadDir, name);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });

  it('uploads a screenshot, writes it to disk, and creates a screenshot evidence row (kind index 0)', async () => {
    mockRunCaseEvidence.bulkCreate.mockImplementation(async (rows) => rows.map((r, i) => ({ id: i + 1, ...r })));

    const res = await request(app)
      .post('/runcaseevidence/screenshot?runCaseId=2')
      .attach('files', Buffer.from('fake-png-bytes'), { filename: '__test_evidence.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);

    const [createdRow] = mockRunCaseEvidence.bulkCreate.mock.calls[0][0];
    expect(createdRow.runCaseId).toBe('2');
    expect(createdRow.userId).toBe(1);
    expect(createdRow.kind).toBe(0);
    expect(createdRow.title).toBe('__test_evidence.png');
    uploadedFilenames.push(createdRow.filename);

    expect(fs.existsSync(path.join(uploadDir, createdRow.filename))).toBe(true);
  });

  it('returns 400 when no files are attached', async () => {
    const res = await request(app).post('/runcaseevidence/screenshot?runCaseId=2');

    expect(res.status).toBe(400);
    expect(mockRunCaseEvidence.bulkCreate).not.toHaveBeenCalled();
  });
});
