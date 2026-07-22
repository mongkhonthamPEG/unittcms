import { getTranslations } from 'next-intl/server';
import ExecuteRunner from './ExecuteRunner';
import { ExecuteMessages } from '@/types/runCaseEvidence';
import { CommentMessages } from '@/types/comment';
import { PriorityMessages } from '@/types/priority';
import { TestTypeMessages } from '@/types/testType';
import { LocaleCodeType } from '@/types/locale';
import { TestRunCaseStatusMessages } from '@/types/status';

export async function generateMetadata({ params: { locale } }: { params: { locale: LocaleCodeType } }) {
  const t = await getTranslations({ locale, namespace: 'Execute' });
  return {
    title: `${t('start_testing')} | UnitTCMS`,
    robots: { index: false, follow: false },
  };
}

export default async function Page({
  params: { projectId, runId, locale },
}: {
  params: { projectId: string; runId: string; locale: string };
}) {
  const e = await getTranslations({ locale, namespace: 'Execute' });
  const messages: ExecuteMessages = {
    casesInThisRun: e('cases_in_this_run'),
    steps: e('steps'),
    comments: e('comments'),
    history: e('history'),
    attachEvidence: e('attach_evidence'),
    screenshot: e('screenshot'),
    dropOrBrowse: e('drop_or_browse'),
    pasteFromClipboard: e('paste_from_clipboard'),
    recordingLink: e('recording_link'),
    recordingLinkPlaceholder: e('recording_link_placeholder'),
    remove: e('remove'),
    pass: e('pass'),
    fail: e('fail'),
    retest: e('retest'),
    skip: e('skip'),
    previousCase: e('previous_case'),
    nextCase: e('next_case'),
    startTesting: e('start_testing'),
    continueTesting: e('continue_testing'),
    allCasesTested: e('all_cases_tested'),
    noCasesInRun: e('no_cases_in_run'),
    backToRun: e('back_to_run'),
    preconditions: e('preconditions'),
    expectedResult: e('expected_result'),
    detailsOfTheStep: e('details_of_the_step'),
    description: e('description'),
    priority: e('priority'),
    type: e('type'),
    tags: e('tags'),
    testDetail: e('test_detail'),
    progress: e('progress'),
    untestedOnly: e('untested_only'),
    caseDetail: e('case_detail'),
  };

  const c = await getTranslations({ locale, namespace: 'Comments' });
  const commentMessages: CommentMessages = {
    comments: c('comments'),
    noComments: c('no_comments'),
    addComment: c('add_comment'),
    save: c('save'),
    cancel: c('cancel'),
    placeholder: c('placeholder'),
    notIncludedInRun: c('not_included_in_run'),
    commentAdded: c('comment_added'),
    failedToAddComment: c('failed_to_add_comment'),
    commentUpdated: c('comment_updated'),
    failedToUpdateComment: c('failed_to_update_comment'),
    commentDeleted: c('comment_deleted'),
    failedToDeleteComment: c('failed_to_delete_comment'),
  };

  const pt = await getTranslations({ locale, namespace: 'Priority' });
  const priorityMessages: PriorityMessages = {
    critical: pt('critical'),
    high: pt('high'),
    medium: pt('medium'),
    low: pt('low'),
  };

  const tt = await getTranslations({ locale, namespace: 'Type' });
  const testTypeMessages: TestTypeMessages = {
    other: tt('other'),
    security: tt('security'),
    performance: tt('performance'),
    accessibility: tt('accessibility'),
    functional: tt('functional'),
    acceptance: tt('acceptance'),
    usability: tt('usability'),
    smokeSanity: tt('smoke_sanity'),
    compatibility: tt('compatibility'),
    destructive: tt('destructive'),
    regression: tt('regression'),
    automated: tt('automated'),
    manual: tt('manual'),
  };

  const rcst = await getTranslations({ locale, namespace: 'RunCaseStatus' });
  const testRunCaseStatusMessages: TestRunCaseStatusMessages = {
    untested: rcst('untested'),
    passed: rcst('passed'),
    failed: rcst('failed'),
    retest: rcst('retest'),
    skipped: rcst('skipped'),
  };

  return (
    <ExecuteRunner
      projectId={projectId}
      runId={runId}
      locale={locale}
      messages={messages}
      commentMessages={commentMessages}
      priorityMessages={priorityMessages}
      testTypeMessages={testTypeMessages}
      testRunCaseStatusMessages={testRunCaseStatusMessages}
    />
  );
}
