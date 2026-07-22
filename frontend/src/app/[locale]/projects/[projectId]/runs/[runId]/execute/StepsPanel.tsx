'use client';

import { templates } from '@/config/selection';
import type { CaseType } from '@/types/case';
import type { ExecuteMessages } from '@/types/runCaseEvidence';

type Props = {
  testCase: CaseType;
  messages: Pick<ExecuteMessages, 'steps' | 'preconditions' | 'expectedResult' | 'detailsOfTheStep'>;
};

export default function StepsPanel({ testCase, messages }: Props) {
  const isTextTemplate = templates[testCase.template]?.uid === 'text';

  const rows = isTextTemplate
    ? [{ id: 'text', left: testCase.preConditions, right: testCase.expectedResults }]
    : (testCase.Steps ?? []).map((s) => ({ id: s.id, left: s.step, right: s.result }));

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-default-400 mb-2.5">{messages.steps}</p>
      <div className="border-1 dark:border-neutral-700 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[28px_1fr_1fr] gap-4 px-4 py-2 bg-neutral-50 dark:bg-neutral-800">
          <span />
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-default-400">
            {isTextTemplate ? messages.preconditions : messages.detailsOfTheStep}
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-default-400">
            {messages.expectedResult}
          </span>
        </div>
        {rows.map((row, i) => (
          <div
            key={row.id}
            className="grid grid-cols-[28px_1fr_1fr] gap-4 px-4 py-3.5 border-t-1 dark:border-neutral-700"
          >
            <span className="font-mono text-xs text-default-400 pt-0.5">{i + 1}</span>
            <span className="text-[13.5px] whitespace-pre-wrap">{row.left}</span>
            <span className="text-[13.5px] text-default-500 whitespace-pre-wrap">{row.right}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
