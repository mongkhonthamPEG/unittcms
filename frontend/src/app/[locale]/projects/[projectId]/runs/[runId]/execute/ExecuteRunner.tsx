'use client';
import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Button, Checkbox, Tooltip, addToast } from '@heroui/react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchRun, fetchProjectCases, updateRunCases } from '../../runsControl';
import EvidencePanel from './EvidencePanel';
import StepsPanel from './StepsPanel';
import ExecuteHistoryPanel from './ExecuteHistoryPanel';
import { createComment } from '@/utils/commentControl';
import { useRouter } from '@/src/i18n/routing';
import Comments from '@/components/Comments';
import { fetchCase } from '@/utils/caseControl';
import { TokenContext } from '@/utils/TokenProvider';
import { logError } from '@/utils/errorHandler';
import { priorities, testTypes } from '@/config/selection';
import type { CaseType, StepType } from '@/types/case';
import type { RunType } from '@/types/run';
import type { ExecuteMessages } from '@/types/runCaseEvidence';
import type { CommentMessages } from '@/types/comment';
import type { PriorityMessages } from '@/types/priority';
import type { TestTypeMessages } from '@/types/testType';
import type { TestRunCaseStatusMessages } from '@/types/status';

type Props = {
  projectId: string;
  runId: string;
  locale: string;
  messages: ExecuteMessages;
  commentMessages: CommentMessages;
  priorityMessages: PriorityMessages;
  testTypeMessages: TestTypeMessages;
  testRunCaseStatusMessages: TestRunCaseStatusMessages;
};

const STATUS_ORDER = [
  {
    status: 4,
    key: 'skip' as const,
    color: 'default' as const,
    variant: 'bordered' as const,
    className: 'border-default-200 dark:border-neutral-700 text-default-500 bg-background',
  },
  {
    status: 3,
    key: 'retest' as const,
    color: 'default' as const,
    variant: 'bordered' as const,
    className: 'border-default-200 dark:border-neutral-700 text-default-500 bg-background',
  },
  {
    status: 2,
    key: 'fail' as const,
    color: 'danger' as const,
    variant: 'flat' as const,
    className: 'font-semibold',
  },
  {
    status: 1,
    key: 'pass' as const,
    color: 'success' as const,
    variant: 'solid' as const,
    className: 'font-bold shadow-sm text-white',
  },
];

const EXECUTION_STATUS_COLORS: Record<number, string> = {
  0: '#2f6fed',
  1: '#1f883d',
  2: '#d92d3a',
  3: '#b6790a',
  4: '#8a3fd1',
};

function getCaseDisplayParts(testCase: CaseType) {
  const title = testCase.title ?? '';
  const match = title.match(/^\s*\[([^\]]+)\]\s*(.*)$/);

  return {
    code: match?.[1] ?? null,
    title: match?.[2]?.trim() || title,
  };
}

function StatusDot({ status, className = '' }: { status: number; className?: string }) {
  return (
    <span
      className={`inline-block rounded-full shrink-0 ${className}`}
      style={{ backgroundColor: EXECUTION_STATUS_COLORS[status] ?? EXECUTION_STATUS_COLORS[0] }}
    />
  );
}

function Pill({ children, dotColor }: { children: React.ReactNode; dotColor?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-1 border-default-200 px-2.5 py-[3px] text-[11.5px] font-semibold text-default-500 dark:border-[#2a2e35]">
      {dotColor && <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: dotColor }} />}
      {children}
    </span>
  );
}

export default function ExecuteRunner({
  projectId,
  runId,
  locale,
  messages,
  commentMessages,
  priorityMessages,
  testTypeMessages,
  testRunCaseStatusMessages,
}: Props) {
  const context = useContext(TokenContext);
  const router = useRouter();
  const isSignedIn = context.isSignedIn();

  const [testRun, setTestRun] = useState<RunType | null>(null);
  const [includedCases, setIncludedCases] = useState<CaseType[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [fullCase, setFullCase] = useState<CaseType | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [untestedOnly, setUntestedOnly] = useState(false);
  const [selectedTab, setSelectedTab] = useState('steps');
  const [noteText, setNoteText] = useState('');
  const isReporter = context.isProjectReporter(Number(projectId));

  useEffect(() => {
    if (!isSignedIn) return;

    async function load() {
      try {
        const { run } = await fetchRun(context.token.access_token, Number(runId));
        setTestRun(run);

        const casesData: CaseType[] = await fetchProjectCases(
          context.token.access_token,
          Number(projectId),
          Number(runId)
        );
        const included = (casesData || [])
          .filter((c) => c.RunCases && c.RunCases.length > 0)
          .sort((a, b) => a.id - b.id);
        setIncludedCases(included);

        if (included.length > 0) {
          const firstUntested = included.find((c) => c.RunCases?.[0]?.status === 0);
          setSelectedCaseId((firstUntested ?? included[0]).id);
        }
      } catch (error: unknown) {
        logError('Error loading execution data', error);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  useEffect(() => {
    if (!selectedCaseId || !isSignedIn) {
      setFullCase(null);
      return;
    }

    async function loadDetail() {
      setIsFetchingDetail(true);
      try {
        const data = await fetchCase(context.token.access_token, selectedCaseId as number);
        if (data.Steps && data.Steps.length > 0) {
          data.Steps.sort((a: StepType, b: StepType) => a.caseSteps.stepNo - b.caseSteps.stepNo);
        }
        setFullCase(data);
      } catch (error: unknown) {
        logError('Error loading case detail', error);
      } finally {
        setIsFetchingDetail(false);
      }
    }

    loadDetail();
    setSelectedTab('steps');
    setNoteText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId, isSignedIn]);

  const visibleCases = useMemo(
    () => (untestedOnly ? includedCases.filter((c) => (c.RunCases?.[0]?.status ?? 0) === 0) : includedCases),
    [includedCases, untestedOnly]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    includedCases.forEach((c) => {
      const status = c.RunCases?.[0]?.status ?? 0;
      counts[status] = (counts[status] ?? 0) + 1;
    });
    return counts;
  }, [includedCases]);

  const total = includedCases.length;
  const doneCount = total - (statusCounts[0] ?? 0);

  const selectedCase = includedCases.find((c) => c.id === selectedCaseId) ?? null;
  const selectedRunCase = selectedCase?.RunCases?.[0] ?? null;
  const selectedCaseDisplay = selectedCase ? getCaseDisplayParts(selectedCase) : null;
  const currentIndex = visibleCases.findIndex((c) => c.id === selectedCaseId);

  const goToOffset = useCallback(
    (offset: number) => {
      if (visibleCases.length === 0) return;
      const idx = currentIndex === -1 ? 0 : currentIndex + offset;
      if (idx < 0 || idx >= visibleCases.length) return;
      setSelectedCaseId(visibleCases[idx].id);
    },
    [visibleCases, currentIndex]
  );

  const handleSetStatus = useCallback(
    async (newStatus: number) => {
      if (!selectedCase || !selectedRunCase || isSavingStatus || !isReporter) return;

      setIsSavingStatus(true);
      const previousStatus = selectedRunCase.status;
      const savedAt = new Date().toISOString();
      setIncludedCases((current) =>
        current.map((c) =>
          c.id === selectedCase.id && c.RunCases
            ? { ...c, RunCases: [{ ...c.RunCases[0], status: newStatus, updatedAt: savedAt }] }
            : c
        )
      );

      try {
        const note = noteText.trim();
        const tasks: Promise<unknown>[] = [
          updateRunCases(context.token.access_token, Number(runId), [
            {
              ...selectedCase,
              RunCases: [{ ...selectedRunCase, status: newStatus, editState: 'changed' }],
            },
          ]),
        ];
        if (note) {
          tasks.push(createComment(context.token.access_token, 'RunCase', selectedRunCase.id, note));
        }
        await Promise.all(tasks);

        if (note) {
          setNoteText('');
          setIncludedCases((current) =>
            current.map((c) =>
              c.id === selectedCase.id && c.RunCases
                ? { ...c, RunCases: [{ ...c.RunCases[0], commentCount: (c.RunCases[0].commentCount ?? 0) + 1 }] }
                : c
            )
          );
        }

        const nextIndex = visibleCases.findIndex(
          (c, idx) => idx > currentIndex && (c.RunCases?.[0]?.status ?? 0) === 0
        );
        if (nextIndex !== -1) {
          setSelectedCaseId(visibleCases[nextIndex].id);
        }
      } catch (error: unknown) {
        logError('Error saving run case status', error);
        setIncludedCases((current) =>
          current.map((c) =>
            c.id === selectedCase.id && c.RunCases
              ? { ...c, RunCases: [{ ...c.RunCases[0], status: previousStatus }] }
              : c
          )
        );
        addToast({ title: 'Error', color: 'danger', description: 'Failed to save result. Please try again.' });
      } finally {
        setIsSavingStatus(false);
      }
    },
    [
      selectedCase,
      selectedRunCase,
      isSavingStatus,
      isReporter,
      noteText,
      context.token.access_token,
      runId,
      visibleCases,
      currentIndex,
    ]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

      const key = e.key.toLowerCase();
      if (key === 'p') handleSetStatus(1);
      else if (key === 'f') handleSetStatus(2);
      else if (key === 'r') handleSetStatus(3);
      else if (key === 's') handleSetStatus(4);
      else if (e.key === 'ArrowRight') goToOffset(1);
      else if (e.key === 'ArrowLeft') goToOffset(-1);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSetStatus, goToOffset]);

  if (!isSignedIn) return null;

  const backToRun = () => router.push(`/projects/${projectId}/runs/${runId}`, { locale });

  if (testRun && includedCases.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl pt-12 px-6 text-center text-default-500">
        <p>{messages.noCasesInRun}</p>
        <Button className="mt-4" variant="bordered" startContent={<ArrowLeft size={16} />} onPress={backToRun}>
          {messages.backToRun}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-[560px] bg-[#f6f7f8] text-[#14161a] dark:bg-[#0a0b0d] dark:text-[#e8e9eb]">
      <aside className="flex w-[260px] shrink-0 flex-col border-r-1 border-default-200 bg-white dark:border-[#2a2e35] dark:bg-[#16181c] min-h-0">
        <div className="border-b-1 border-default-200 p-4 pb-2.5 dark:border-[#2a2e35]">
          <button
            type="button"
            onClick={backToRun}
            className="mb-2 flex items-center gap-1.5 text-xs text-default-500 transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} />
            {testRun?.name}
          </button>
          <h1 className="text-[15px] font-bold mb-2 -tracking-[0.01em]">{messages.casesInThisRun}</h1>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-[5px] flex-1 overflow-hidden rounded-full bg-[#eef0f2] dark:bg-[#1c1f24]">
              {STATUS_ORDER.slice()
                .reverse()
                .map(({ status }) => (
                  <div
                    key={status}
                    style={{
                      width: `${total > 0 ? ((statusCounts[status] ?? 0) / total) * 100 : 0}%`,
                      backgroundColor: EXECUTION_STATUS_COLORS[status],
                    }}
                  />
                ))}
            </div>
            <span className="text-[11.5px] text-default-400 font-mono whitespace-nowrap">
              {doneCount} / {total}
            </span>
          </div>
          <Checkbox
            size="sm"
            isSelected={untestedOnly}
            onValueChange={setUntestedOnly}
            classNames={{ label: 'text-[11.5px] text-default-400' }}
          >
            {messages.untestedOnly}
          </Checkbox>
        </div>

        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {visibleCases.map((c) => {
            const status = c.RunCases?.[0]?.status ?? 0;
            const isCurrent = c.id === selectedCaseId;
            const display = getCaseDisplayParts(c);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCaseId(c.id)}
                className={`mb-0.5 flex w-full items-start gap-[9px] rounded-[7px] border-1 px-2.5 py-2 text-left transition-colors ${
                  isCurrent
                    ? 'border-default-200 bg-neutral-100/80 shadow-[inset_2px_0_0_#0f1115,0_1px_2px_rgba(20,22,26,0.06),0_8px_24px_rgba(20,22,26,0.06)] dark:border-[#2a2e35] dark:bg-[#1c1f24] dark:shadow-[inset_2px_0_0_#1f883d,0_1px_2px_rgba(0,0,0,0.4),0_12px_32px_rgba(0,0,0,0.35)]'
                    : 'border-transparent hover:bg-[#eef0f2] dark:hover:bg-[#1c1f24]'
                }`}
              >
                <StatusDot status={status} className="w-2 h-2 mt-[5px]" />
                <span className="min-w-0">
                  <span className="block font-mono text-[10.5px] text-default-400">{display.code ?? `#${c.id}`}</span>
                  <span className="mt-px block truncate text-[12.5px]">{display.title}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#16181c]">
        {selectedCase && selectedRunCase ? (
          <>
            <div className="max-w-[760px] w-full px-7 pt-[22px] shrink-0">
              <span className="font-mono text-xs text-default-400">
                #{selectedCase.id}
                {selectedCaseDisplay?.code ? ` · ${selectedCaseDisplay.code}` : ''}
              </span>
              <h2 className="mt-1 mb-3.5 text-[21px] font-semibold leading-tight -tracking-[0.015em] [text-wrap:balance]">
                {selectedCaseDisplay?.title}
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <Pill dotColor={priorities[selectedCase.priority]?.color}>
                  {priorityMessages[priorities[selectedCase.priority]?.uid]}
                </Pill>
                <Pill>{testTypeMessages[testTypes[selectedCase.type]?.uid]}</Pill>
                {selectedCase.Tags?.map((tag) => (
                  <Pill key={tag.id}>{tag.name}</Pill>
                ))}
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Execution detail"
              className="shrink-0 border-b-1 border-default-200 bg-white dark:border-[#2a2e35] dark:bg-[#16181c]"
            >
              <div className="flex gap-0 px-7 pt-2.5">
                {[
                  { key: 'steps', label: messages.steps },
                  { key: 'comments', label: messages.comments, count: selectedRunCase.commentCount ?? 0 },
                  { key: 'history', label: messages.history },
                ].map((tab) => {
                  const isSelected = selectedTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-semibold border-b-2 transition-colors ${
                        isSelected
                          ? 'text-foreground border-foreground'
                          : 'text-default-500 border-transparent hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                      {typeof tab.count === 'number' && tab.count > 0 && (
                        <span className="bg-neutral-100 dark:bg-neutral-800 text-default-400 text-[10.5px] px-1.5 rounded-full">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-[#16181c]">
              {selectedTab === 'steps' && (
                <div className="max-w-[760px] w-full mx-auto px-7 py-6">
                  {isFetchingDetail || !fullCase ? (
                    <div className="text-default-400 text-sm">…</div>
                  ) : (
                    <StepsPanel testCase={fullCase} messages={messages} />
                  )}
                </div>
              )}
              {selectedTab === 'comments' && (
                <div className="max-w-[760px] w-full mx-auto px-7 py-6">
                  <Comments
                    projectId={projectId}
                    commentableType="RunCase"
                    commentableId={selectedRunCase.id}
                    messages={commentMessages}
                  />
                </div>
              )}
              {selectedTab === 'history' && (
                <div className="max-w-[760px] w-full mx-auto px-7 py-6">
                  <ExecuteHistoryPanel
                    runCase={selectedRunCase}
                    locale={locale}
                    testRunCaseStatusMessages={testRunCaseStatusMessages}
                  />
                </div>
              )}
            </div>

            <div className="mt-auto flex shrink-0 items-start gap-3.5 border-t-1 border-default-200 bg-white px-7 py-3.5 shadow-[0_-1px_2px_rgba(20,22,26,0.05),0_-10px_20px_rgba(20,22,26,0.05)] dark:border-[#2a2e35] dark:bg-[#16181c] dark:shadow-[0_-1px_2px_rgba(0,0,0,0.35),0_-14px_28px_rgba(0,0,0,0.35)]">
              <Tooltip content={`${messages.previousCase} (←)`}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="bordered"
                  className="mt-0.5"
                  isDisabled={currentIndex <= 0}
                  onPress={() => goToOffset(-1)}
                >
                  <ChevronLeft size={15} />
                </Button>
              </Tooltip>

              <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note before marking a result…"
                    className="flex-1 min-w-0 bg-neutral-100 dark:bg-neutral-800 border-1 dark:border-neutral-700 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    {STATUS_ORDER.map(({ status, key }) => (
                      <button
                        key={status}
                        type="button"
                        disabled={isSavingStatus || !isReporter}
                        onClick={() => handleSetStatus(status)}
                        className={`inline-flex h-8 items-center gap-[7px] rounded-lg border-1 px-3 text-[12.5px] font-semibold transition-[filter,background-color,border-color] disabled:cursor-not-allowed disabled:opacity-50 ${
                          status === 1
                            ? 'border-transparent bg-[#1f883d] text-white shadow-[0_1px_2px_rgba(20,22,26,0.06),0_8px_24px_rgba(20,22,26,0.06)] hover:brightness-105 active:brightness-95'
                            : status === 2
                              ? 'border-[#d92d3a66] bg-[#d92d3a1a] text-[#d92d3a] hover:brightness-105 active:brightness-95 dark:border-[#f0525f66] dark:bg-[#f0525f1a] dark:text-[#f0525f]'
                              : 'border-default-200 bg-white text-default-500 hover:bg-[#eef0f2] active:bg-default-200 dark:border-[#2a2e35] dark:bg-[#16181c] dark:hover:bg-[#1c1f24]'
                        }`}
                      >
                        {status !== 1 && <StatusDot status={status} className="w-2 h-2" />}
                        {messages[key]}
                        <span
                          className={`ms-0.5 rounded border-1 px-1 font-mono text-[10px] leading-4 ${
                            status === 1
                              ? 'border-white/30 bg-white/20 text-white'
                              : 'border-default-200 bg-[#eef0f2] text-default-400 dark:border-[#2a2e35] dark:bg-[#1c1f24]'
                          }`}
                        >
                          {key[0].toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <EvidencePanel runCaseId={selectedRunCase.id} messages={messages} />
              </div>

              <Tooltip content={`${messages.nextCase} (→)`}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="bordered"
                  className="mt-0.5"
                  isDisabled={currentIndex === -1 || currentIndex >= visibleCases.length - 1}
                  onPress={() => goToOffset(1)}
                >
                  <ChevronRight size={15} />
                </Button>
              </Tooltip>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-default-400 text-sm">
            {messages.noCasesInRun}
          </div>
        )}
      </section>
    </div>
  );
}
