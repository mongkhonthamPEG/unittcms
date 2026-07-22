import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Sequelize } from 'sequelize';
import runCaseEvidenceIndexRoute from './index.js';

vi.mock('../../middleware/auth.js', () => ({
  default: () => ({
    verifySignedIn: vi.fn((req, res, next) => {
      req.userId = 1;
      next();
    }),
  }),
}));

let mockVisible = true;
vi.mock('../../middleware/verifyVisible.js', () => ({
  default: () => ({
    verifyProjectVisibleFromRunCaseId: vi.fn((req, res, next) => {
      if (mockVisible) return next();
      return res.status(403).json({ error: 'Forbidden' });
    }),
  }),
}));

const mockRunCaseEvidence = {
  findAll: vi.fn(),
};
vi.mock('../../models/runCaseEvidence.js', () => ({
  default: () => mockRunCaseEvidence,
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });
  app.use('/runcaseevidence', runCaseEvidenceIndexRoute(sequelize));
  return app;
}

describe('GET /runcaseevidence', () => {
  let app;

  beforeEach(() => {
    mockVisible = true;
    app = makeApp();
    vi.clearAllMocks();
    mockVisible = true;
  });

  it('returns evidence rows for the given runCaseId, ordered by createdAt ascending', async () => {
    mockRunCaseEvidence.findAll.mockResolvedValue([
      { id: 1, runCaseId: 2, kind: 0, filename: 'a.png' },
      { id: 2, runCaseId: 2, kind: 1, url: 'https://loom.com/x' },
    ]);

    const res = await request(app).get('/runcaseevidence?runCaseId=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockRunCaseEvidence.findAll).toHaveBeenCalledWith({
      where: { runCaseId: '2' },
      order: [['createdAt', 'ASC']],
    });
  });

  it('returns 403 when the project is not visible to the user', async () => {
    mockVisible = false;

    const res = await request(app).get('/runcaseevidence?runCaseId=2');

    expect(res.status).toBe(403);
    expect(mockRunCaseEvidence.findAll).not.toHaveBeenCalled();
  });

  it('returns 500 when the query fails', async () => {
    mockRunCaseEvidence.findAll.mockRejectedValue(new Error('db down'));

    const res = await request(app).get('/runcaseevidence?runCaseId=2');

    expect(res.status).toBe(500);
  });
});
