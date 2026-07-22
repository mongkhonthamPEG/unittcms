'use client';

import { Clock, PlayCircle, CheckCircle2 } from 'lucide-react';
import { testRunCaseStatus } from '@/config/selection';
import type { TestRunCaseStatusMessages } from '@/types/status';

type RunCaseSnapshot = {
  status: number;
  createdAt?: string;
  updatedAt?: string;
};

type Props = {
  runCase: RunCaseSnapshot;
  locale: string;
  testRunCaseStatusMessages: TestRunCaseStatusMessages;
};

function formatDate(value: string | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function ExecuteHistoryPanel({ runCase, locale, testRunCaseStatusMessages }: Props) {
  const status = testRunCaseStatus[runCase.status] ?? testRunCaseStatus[0];
  const createdAt = formatDate(runCase.createdAt, locale);
  const updatedAt = formatDate(runCase.updatedAt, locale);
  const hasStatusChange = updatedAt && updatedAt !== createdAt;

  const entries = [
    {
      key: 'created',
      icon: <PlayCircle size={15} />,
      title: 'Added to this run',
      detail: createdAt ?? 'Timestamp unavailable',
    },
    {
      key: 'status',
      icon: <CheckCircle2 size={15} />,
      title: `Current result: ${testRunCaseStatusMessages[status.uid]}`,
      detail: hasStatusChange ? `Last saved ${updatedAt}` : 'No result change saved yet',
      dotColor: status.chartColor,
    },
  ];

  return (
    <div>
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-default-400">History</p>
      <div className="overflow-hidden rounded-lg border-1 border-default-200 dark:border-[#2a2e35]">
        {entries.map((entry, index) => (
          <div
            key={entry.key}
            className={`grid grid-cols-[30px_1fr] gap-3 px-4 py-3.5 ${
              index > 0 ? 'border-t-1 border-default-200 dark:border-[#2a2e35]' : ''
            }`}
          >
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-[#eef0f2] text-default-500 dark:bg-[#1c1f24]">
              {entry.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {entry.dotColor && (
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.dotColor }} />
                )}
                <p className="text-[13.5px] font-semibold">{entry.title}</p>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-default-500">
                <Clock size={12} />
                {entry.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
