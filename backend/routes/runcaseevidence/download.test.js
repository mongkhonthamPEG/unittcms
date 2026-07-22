import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Sequelize } from 'sequelize';
import runCaseEvidenceDownloadRoute from './download.js';

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

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
  },
}));

const mockRunCaseEvidence = {
  findByPk: vi.fn(),
};
vi.mock('../../models/runCaseEvidence.js', () => ({
  default: () => mockRunCaseEvidence,
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });
  app.use('/runcaseevidence', runCaseEvidenceDownloadRoute(sequelize));
  return app;
}

describe('GET /runcaseevidence/download/:evidenceId', () => {
  let app;
  let fs;

  beforeEach(async () => {
    app = makeApp();
    vi.clearAllMocks();
    fs = (await import('fs')).default;
  });

  it('returns 404 when evidence does not exist', async () => {
    mockRunCaseEvidence.findByPk.mockResolvedValue(null);

    const res = await request(app).get('/runcaseevidence/download/5?runCaseId=2');

    expect(res.status).toBe(404);
  });

  it('returns 404 when evidence belongs to a different runCase', async () => {
    mockRunCaseEvidence.findByPk.mockResolvedValue({ runCaseId: 999, filename: 'a.png' });

    const res = await request(app).get('/runcaseevidence/download/5?runCaseId=2');

    expect(res.status).toBe(404);
  });

  it('returns 404 when evidence has no filename (a video-link row)', async () => {
    mockRunCaseEvidence.findByPk.mockResolvedValue({ runCaseId: 2, filename: null, url: 'https://x.test' });

    const res = await request(app).get('/runcaseevidence/download/5?runCaseId=2');

    expect(res.status).toBe(404);
  });

  it('returns 404 when the file is missing from disk', async () => {
    mockRunCaseEvidence.findByPk.mockResolvedValue({ runCaseId: 2, filename: 'a.png' });
    fs.existsSync.mockReturnValue(false);

    const res = await request(app).get('/runcaseevidence/download/5?runCaseId=2');

    expect(res.status).toBe(404);
  });
});
