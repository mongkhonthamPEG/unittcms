import { logError } from './errorHandler';
import { RunCaseEvidenceType } from '@/types/runCaseEvidence';
import Config from '@/config/config';
const apiServer = Config.apiServer;

async function fetchRunCaseEvidence(jwt: string, runCaseId: number): Promise<RunCaseEvidenceType[]> {
  const url = `${apiServer}/runcaseevidence?runCaseId=${runCaseId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return (await response.json()) || [];
  } catch (error: unknown) {
    logError('Error fetching run case evidence:', error);
    return [];
  }
}

async function uploadScreenshotEvidence(jwt: string, runCaseId: number, files: File[]): Promise<RunCaseEvidenceType[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const url = `${apiServer}/runcaseevidence/screenshot?runCaseId=${runCaseId}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error: unknown) {
    logError('Error uploading screenshot evidence:', error);
    throw error;
  }
}

async function addVideoLinkEvidence(jwt: string, runCaseId: number, url: string): Promise<RunCaseEvidenceType> {
  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ url }),
  };

  const requestUrl = `${apiServer}/runcaseevidence/video?runCaseId=${runCaseId}`;
  try {
    const response = await fetch(requestUrl, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error: unknown) {
    logError('Error adding video link evidence:', error);
    throw error;
  }
}

async function deleteRunCaseEvidence(jwt: string, runCaseId: number, evidenceId: number): Promise<void> {
  const url = `${apiServer}/runcaseevidence/${evidenceId}?runCaseId=${runCaseId}`;
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  } catch (error: unknown) {
    logError('Error deleting run case evidence:', error);
    throw error;
  }
}

async function downloadEvidenceFile(jwt: string, runCaseId: number, evidence: RunCaseEvidenceType): Promise<void> {
  const url = `${apiServer}/runcaseevidence/download/${evidence.id}?runCaseId=${runCaseId}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = evidence.title || evidence.filename || 'screenshot';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(objectUrl);
  } catch (error: unknown) {
    logError('Error downloading evidence file:', error);
  }
}

async function fetchEvidenceFileBlob(jwt: string, runCaseId: number, evidenceId: number): Promise<Blob> {
  const url = `${apiServer}/runcaseevidence/download/${evidenceId}?runCaseId=${runCaseId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return response.blob();
}

export {
  fetchRunCaseEvidence,
  uploadScreenshotEvidence,
  addVideoLinkEvidence,
  deleteRunCaseEvidence,
  downloadEvidenceFile,
  fetchEvidenceFileBlob,
};
