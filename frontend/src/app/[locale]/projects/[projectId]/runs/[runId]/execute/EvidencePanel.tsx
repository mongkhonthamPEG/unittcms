'use client';
import { useEffect, useRef, useState, useContext, useCallback } from 'react';
import { Button, Input, Spinner, addToast } from '@heroui/react';
import { Paperclip, Image as ImageIcon, Video, X } from 'lucide-react';
import { TokenContext } from '@/utils/TokenProvider';
import {
  fetchRunCaseEvidence,
  uploadScreenshotEvidence,
  addVideoLinkEvidence,
  deleteRunCaseEvidence,
  downloadEvidenceFile,
  fetchEvidenceFileBlob,
} from '@/utils/runCaseEvidenceControl';
import { logError } from '@/utils/errorHandler';
import { runCaseEvidenceKind } from '@/config/selection';
import type { RunCaseEvidenceType, ExecuteMessages } from '@/types/runCaseEvidence';

type Props = {
  runCaseId: number | null;
  messages: ExecuteMessages;
};

export default function EvidencePanel({ runCaseId, messages }: Props) {
  const context = useContext(TokenContext);
  const [evidence, setEvidence] = useState<RunCaseEvidenceType[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      if (!runCaseId || !context.isSignedIn()) {
        setEvidence([]);
        return;
      }
      const data = await fetchRunCaseEvidence(context.token.access_token, runCaseId);
      setEvidence(data);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runCaseId]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!runCaseId || files.length === 0) return;
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));
      if (imageFiles.length === 0) {
        setUploadError('Choose an image file.');
        return;
      }

      setIsUploading(true);
      setUploadError(null);
      try {
        const created = await uploadScreenshotEvidence(context.token.access_token, runCaseId, imageFiles);
        setEvidence((prev) => [...prev, ...created]);
      } catch (error: unknown) {
        logError('Error uploading screenshot', error);
        setUploadError('Upload failed. Please try again.');
        addToast({ title: 'Upload failed', color: 'danger', description: 'Could not attach the image file.' });
      } finally {
        setIsUploading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runCaseId]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const files = items
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);
      if (files.length > 0) {
        uploadFiles(files);
      }
    },
    [uploadFiles]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) uploadFiles(files);
  };

  const handleAddVideoLink = async () => {
    if (!runCaseId || !videoUrl.trim()) return;
    try {
      const created = await addVideoLinkEvidence(context.token.access_token, runCaseId, videoUrl.trim());
      setEvidence((prev) => [...prev, created]);
      setVideoUrl('');
    } catch (error: unknown) {
      logError('Error adding video link', error);
    }
  };

  const handleRemove = async (item: RunCaseEvidenceType) => {
    if (!runCaseId) return;
    try {
      await deleteRunCaseEvidence(context.token.access_token, runCaseId, item.id);
      setEvidence((prev) => prev.filter((e) => e.id !== item.id));
    } catch (error: unknown) {
      logError('Error deleting evidence', error);
    }
  };

  const screenshotKind = runCaseEvidenceKind.findIndex((k) => k.uid === 'screenshot');
  const videoKind = runCaseEvidenceKind.findIndex((k) => k.uid === 'videoLink');
  const screenshots = evidence.filter((e) => e.kind === screenshotKind);
  const videoLinks = evidence.filter((e) => e.kind === videoKind);
  const screenshotIds = screenshots.map((item) => item.id).join(',');

  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];

    async function loadPreviews() {
      if (!runCaseId || screenshots.length === 0 || !context.isSignedIn()) {
        setPreviewUrls((previous) => {
          Object.values(previous).forEach((url) => window.URL.revokeObjectURL(url));
          return {};
        });
        return;
      }

      const entries = await Promise.all(
        screenshots.map(async (item) => {
          try {
            const blob = await fetchEvidenceFileBlob(context.token.access_token, runCaseId, item.id);
            const url = window.URL.createObjectURL(blob);
            createdUrls.push(url);
            return [item.id, url] as const;
          } catch (error: unknown) {
            logError('Error loading screenshot preview', error);
            return null;
          }
        })
      );

      if (!active) {
        createdUrls.forEach((url) => window.URL.revokeObjectURL(url));
        return;
      }

      setPreviewUrls((previous) => {
        Object.values(previous).forEach((url) => window.URL.revokeObjectURL(url));
        return Object.fromEntries(entries.filter((entry): entry is readonly [number, string] => entry !== null));
      });
    }

    loadPreviews();

    return () => {
      active = false;
      createdUrls.forEach((url) => window.URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runCaseId, screenshotIds]);

  if (!runCaseId) return null;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border-1 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-semibold"
      >
        <Paperclip size={13} />
        {messages.attachEvidence}
        {evidence.length > 0 && (
          <span className="rounded-full bg-primary text-white text-[10px] font-bold px-1.5">{evidence.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-default-400 mb-1.5">
              {messages.screenshot}
            </p>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onPaste={handlePaste}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              tabIndex={0}
              role="button"
              aria-busy={isUploading}
              className="flex items-center gap-2 rounded-lg border-1 border-dashed dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-3 text-xs cursor-pointer transition-colors hover:border-primary"
            >
              {isUploading ? (
                <Spinner size="sm" className="shrink-0" />
              ) : (
                <ImageIcon size={18} className="text-default-400 shrink-0" />
              )}
              <span className="text-default-500">
                <strong className="text-foreground">{messages.dropOrBrowse}</strong> — {messages.pasteFromClipboard}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) uploadFiles(files);
                  e.target.value = '';
                }}
              />
            </div>
            {uploadError && <p className="mt-1.5 text-xs text-danger">{uploadError}</p>}
            {screenshots.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {screenshots.map((item) => (
                  <div
                    key={item.id}
                    className="relative w-14 h-14 rounded-md border-1 dark:border-neutral-700 bg-gradient-to-br from-primary-100 to-success-100 dark:from-primary-900 dark:to-success-900 flex items-end overflow-hidden cursor-pointer"
                    onClick={() => downloadEvidenceFile(context.token.access_token, runCaseId, item)}
                    title={item.title ?? undefined}
                  >
                    {previewUrls[item.id] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrls[item.id]}
                        alt={item.title ?? item.filename ?? messages.screenshot}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    <span className="text-[8px] bg-black/60 text-white px-0.5 w-full truncate">
                      {item.title ?? item.filename}
                    </span>
                    <button
                      type="button"
                      aria-label={messages.remove}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(item);
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-default-400 mb-1.5">
              {messages.recordingLink}
            </p>
            <div className="flex items-center gap-2">
              <Input
                size="sm"
                variant="bordered"
                type="url"
                placeholder={messages.recordingLinkPlaceholder}
                value={videoUrl}
                onValueChange={setVideoUrl}
                onKeyDown={(e) => e.key === 'Enter' && handleAddVideoLink()}
                startContent={<Video size={14} className="text-default-400" />}
              />
              <Button size="sm" variant="flat" onPress={handleAddVideoLink} isDisabled={!videoUrl.trim()}>
                +
              </Button>
            </div>
            {videoLinks.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                {videoLinks.map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border-1 dark:border-neutral-700 px-2 py-1 text-xs max-w-full"
                  >
                    <Video size={12} className="text-primary shrink-0" />
                    <a
                      href={item.url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-default-500 hover:underline"
                    >
                      {item.url}
                    </a>
                    <button
                      type="button"
                      aria-label={messages.remove}
                      className="w-4 h-4 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center shrink-0"
                      onClick={() => handleRemove(item)}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
