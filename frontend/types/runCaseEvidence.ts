type RunCaseEvidenceType = {
  id: number;
  runCaseId: number;
  userId: number | null;
  kind: number;
  filename: string | null;
  title: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
};

type ExecuteMessages = {
  casesInThisRun: string;
  steps: string;
  comments: string;
  history: string;
  attachEvidence: string;
  screenshot: string;
  dropOrBrowse: string;
  pasteFromClipboard: string;
  recordingLink: string;
  recordingLinkPlaceholder: string;
  remove: string;
  pass: string;
  fail: string;
  retest: string;
  skip: string;
  previousCase: string;
  nextCase: string;
  startTesting: string;
  continueTesting: string;
  allCasesTested: string;
  noCasesInRun: string;
  backToRun: string;
  preconditions: string;
  expectedResult: string;
  detailsOfTheStep: string;
  description: string;
  priority: string;
  type: string;
  tags: string;
  testDetail: string;
  progress: string;
  untestedOnly: string;
  caseDetail: string;
};

export type { RunCaseEvidenceType, ExecuteMessages };
