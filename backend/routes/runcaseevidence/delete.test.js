import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Sequelize } from 'sequelize';
import runCaseEvidenceDeleteRoute from './delete.js';

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
    unlink: vi.fn((filePath, cb) => cb(null)),
  },
}));

const mockEvidenceInstance = {
  runCaseId: 2,
  filename: 'tc001-fail.png',
  destroy: vi.fn(),
};

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
  sequelize.transaction = vi.fn(async () => ({ commit: vi.fn(), rollback: vi.fn() }));
  app.use('/runcaseevidence', runCaseEvidenceDeleteRoute(sequelize));
  return app;
}

describe('DELETE /runcaseevidence/:evidenceId', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
    mockEvidenceInstance.destroy = vi.fn();
  });

  it('deletes a screenshot evidence row and unlinks its file', async () => {
    mockRunCaseEvidence.findByPk.mockResolvedValue(mockEvidenceInstance);

    const res = await request(app).delete('/runcaseevidence/5?runCaseId=2');

    expect(res.status).toBe(204);
    expect(mockEvidenceInstance.destroy).toHaveBeenCalled();
  });

  it('deletes a video-link evidence row without touching the filesystem', async () => {
    mockRunCaseEvidence.findByPk.mockResolvedValue({
      runCaseId: 2,
      filename: null,
      destroy: vi.fn(),
    });

    const res = await request(app).delete('/runcaseevidence/6?runCaseId=2');

    expect(res.status).toBe(204);
  });

  it('returns 404 when the evidence does not exist', async () => {
    mockRunCaseEvidence.findByPk.mockResolvedValue(null);

    const res = await request(app).delete('/runcaseevidence/999?runCaseId=2');

    expect(res.status).toBe(404);
  });

  it('returns 404 when the evidence belongs to a different runCase', async () => {
    mockRunCaseEvidence.findByPk.mockResolvedValue({ runCaseId: 999, filename: null, destroy: vi.fn() });

    const res = await request(app).delete('/runcaseevidence/5?runCaseId=2');

    expect(res.status).toBe(404);
    expect(mockEvidenceInstance.destroy).not.toHaveBeenCalled();
  });
});
