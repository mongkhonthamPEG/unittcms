import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Sequelize } from 'sequelize';
import runCaseEvidenceVideoRoute from './video.js';

vi.mock('../../middleware/auth.js', () => ({
  default: () => ({
    verifySignedIn: vi.fn((req, res, next) => {
      req.userId = 9;
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
  create: vi.fn(),
};
vi.mock('../../models/runCaseEvidence.js', () => ({
  default: () => mockRunCaseEvidence,
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  const sequelize = new Sequelize({ dialect: 'sqlite', logging: false });
  app.use('/runcaseevidence', runCaseEvidenceVideoRoute(sequelize));
  return app;
}

describe('POST /runcaseevidence/video', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
  });

  it('creates a videoLink evidence row (kind index 1) scoped to the user and runCase', async () => {
    mockRunCaseEvidence.create.mockResolvedValue({
      id: 5,
      runCaseId: 2,
      userId: 9,
      kind: 1,
      url: 'https://loom.com/share/abc',
    });

    const res = await request(app)
      .post('/runcaseevidence/video?runCaseId=2')
      .send({ url: 'https://loom.com/share/abc' });

    expect(res.status).toBe(200);
    expect(mockRunCaseEvidence.create).toHaveBeenCalledWith({
      runCaseId: '2',
      userId: 9,
      kind: 1,
      url: 'https://loom.com/share/abc',
    });
  });

  it('trims whitespace from the url', async () => {
    mockRunCaseEvidence.create.mockResolvedValue({});

    await request(app).post('/runcaseevidence/video?runCaseId=2').send({ url: '  https://loom.com/x  ' });

    expect(mockRunCaseEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://loom.com/x' }),
    );
  });

  it('returns 400 when url is missing', async () => {
    const res = await request(app).post('/runcaseevidence/video?runCaseId=2').send({});

    expect(res.status).toBe(400);
    expect(mockRunCaseEvidence.create).not.toHaveBeenCalled();
  });

  it('returns 400 when url is empty/whitespace', async () => {
    const res = await request(app).post('/runcaseevidence/video?runCaseId=2').send({ url: '   ' });

    expect(res.status).toBe(400);
    expect(mockRunCaseEvidence.create).not.toHaveBeenCalled();
  });

  it('returns 500 when create fails', async () => {
    mockRunCaseEvidence.create.mockRejectedValue(new Error('db down'));

    const res = await request(app)
      .post('/runcaseevidence/video?runCaseId=2')
      .send({ url: 'https://loom.com/x' });

    expect(res.status).toBe(500);
  });
});
