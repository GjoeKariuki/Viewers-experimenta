import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useActiveViewportDisplaySets } from '@ohif/core';

type ReportAuthor = {
  name?: string | null;
  role?: string | null;
};

type StudyReport = {
  id: string;
  title?: string | null;
  study_id?: string | null;
  status?: string | null;
  content?: string | null;
  rich_text_field?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  author?: ReportAuthor | null;
  author_name?: string | null;
  report_created_by_name?: string | null;
  editable?: boolean;
  locked_message?: string | null;
  detail_url?: string | null;
  pdf_file?: string | null;
  pdf?: {
    file_url?: string | null;
    url?: string | null;
    download_url?: string | null;
  } | null;
};

type ReportPayload = {
  reports: StudyReport[];
  activeReport?: StudyReport | null;
  studyId?: string;
};

const explicitStudyKeys = ['reportStudyId', 'study_id', 'studyId', 'med_record', 'medRecord'];
const queryStudyKeys = ['StudyInstanceUIDs', 'studyInstanceUIDs', 'StudyInstanceUID'];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function pickString(record: Record<string, unknown> | null, ...keys: string[]) {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function splitStudyValues(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/[;,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function unique(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    if (!value || seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getReportConfig() {
  if (typeof window === 'undefined') {
    return {};
  }

  const config =
    (window as any).OHIFStudyReports ||
    (window as any).studyReports ||
    (window as any).config?.studyReports ||
    {};

  return asRecord(config) || {};
}

const REPORTS_API_BASE_URL = 'https://home.kpnmedpacs.com';

function normalizeBaseUrl(value?: unknown) {
  const baseUrl = typeof value === 'string' && value.trim() ? value.trim() : REPORTS_API_BASE_URL;

  return baseUrl.replace(/\/+$/, '');
}

function buildUrl(path: string, params?: Record<string, string>) {
  const config = getReportConfig();

  const baseUrl = normalizeBaseUrl(config.apiBaseUrl || REPORTS_API_BASE_URL);

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(cleanPath, `${baseUrl}/`);

  Object.entries(params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

function normalizeExternalUrl(value?: string | null) {
  if (!value) {
    return '';
  }

  if (/^(https?:|blob:|data:)/i.test(value)) {
    return value;
  }

  return buildUrl(value);
}

function normalizeReport(payload: unknown): StudyReport | null {
  const record = asRecord(payload);
  const id = pickString(record, 'id', 'report_id');

  if (!id) {
    return null;
  }

  const author = asRecord(record?.author);
  const pdf = asRecord(record?.pdf);

  return {
    id,
    title: pickString(record, 'title') ?? null,
    study_id: pickString(record, 'study_id', 'studyId') ?? null,
    status: pickString(record, 'status') ?? null,
    content:
      pickString(
        record,
        'content',
        'report_content',
        'reportContent',
        'report_text',
        'reportText',
        'report_html',
        'reportHtml',
        'html',
        'body',
        'text',
        'description',
        'findings',
        'impression'
      ) ?? null,
    rich_text_field:
      pickString(record, 'rich_text_field', 'richTextField', 'rich_text', 'richText', 'report') ??
      null,
    created_at: pickString(record, 'created_at') ?? null,
    updated_at: pickString(record, 'updated_at') ?? null,
    author: author
      ? {
          name: pickString(author, 'name'),
          role: pickString(author, 'role'),
        }
      : null,
    author_name: pickString(record, 'author_name') ?? null,
    report_created_by_name: pickString(record, 'report_created_by_name') ?? null,
    editable: typeof record?.editable === 'boolean' ? record.editable : undefined,
    locked_message: pickString(record, 'locked_message') ?? null,
    detail_url: pickString(record, 'detail_url', 'api_url') ?? null,
    pdf_file:
      pickString(
        record,
        'pdf_file',
        'pdfFile',
        'pdf_url',
        'pdfUrl',
        'pdf_file_url',
        'pdfFileUrl',
        'pdf_path',
        'pdfPath',
        'file_url',
        'fileUrl',
        'file'
      ) ?? null,
    pdf: pdf
      ? {
          file_url: pickString(pdf, 'file_url', 'file'),
          url: pickString(pdf, 'url'),
          download_url: pickString(pdf, 'download_url'),
        }
      : null,
  };
}

function getReportList(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  for (const key of ['reports', 'results', 'items', 'existing_reports', 'report_data']) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  if ('data' in record) {
    const nested = getReportList(record.data);
    if (nested.length) {
      return nested;
    }
  }

  if ('report' in record) {
    return [record.report];
  }

  return [];
}

function normalizeReportDetailPayload(payload: unknown): StudyReport | null {
  const directReport = normalizeReport(payload);
  if (directReport) {
    return directReport;
  }

  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  for (const key of ['report', 'data', 'result', 'item', 'active_report']) {
    const nestedReport = normalizeReport(record[key]);
    if (nestedReport) {
      return nestedReport;
    }
  }

  const [firstReport] = getReportList(payload)
    .map(normalizeReport)
    .filter(Boolean) as StudyReport[];
  return firstReport || null;
}

function mergeReports(reports: StudyReport[], activeReport?: StudyReport | null) {
  const byId = new Map<string, StudyReport>();

  reports.forEach(report => byId.set(report.id, report));
  if (activeReport) {
    byId.set(activeReport.id, {
      ...byId.get(activeReport.id),
      ...activeReport,
    });
  }

  return Array.from(byId.values());
}

function normalizeBootstrapPayload(payload: unknown, studyId: string): ReportPayload {
  const record = asRecord(payload);
  const reports = getReportList(record).map(normalizeReport).filter(Boolean) as StudyReport[];
  const activeReport = normalizeReport(record?.active_report);

  return {
    reports: mergeReports(reports, activeReport),
    activeReport,
    studyId,
  };
}

function normalizeLegacyPayload(payload: unknown, studyId: string): ReportPayload {
  const reports = getReportList(payload).map(normalizeReport).filter(Boolean) as StudyReport[];
  const singleReport = normalizeReport(payload);

  return {
    reports: mergeReports(reports, singleReport),
    activeReport: singleReport,
    studyId,
  };
}

function getStudyIdCandidates(activeDisplaySets) {
  if (typeof window === 'undefined') {
    return [];
  }

  const params = new URLSearchParams(window.location.search);
  const explicitValues = explicitStudyKeys.flatMap(key => splitStudyValues(params.get(key)));
  const queryValues = queryStudyKeys.flatMap(key =>
    params.getAll(key).flatMap(value => splitStudyValues(value))
  );
  const activeDisplaySetValues = (activeDisplaySets || []).flatMap(displaySet => [
    displaySet?.reportStudyId,
    displaySet?.study_id,
    displaySet?.studyId,
    displaySet?.med_record,
    displaySet?.medRecord,
    displaySet?.StudyInstanceUID,
    displaySet?.studyInstanceUID,
  ]);

  return unique([...explicitValues, ...activeDisplaySetValues, ...queryValues]);
}

function getContent(report?: StudyReport | null) {
  return report?.content || report?.rich_text_field || '';
}

function getPdfUrl(report?: StudyReport | null) {
  return normalizeExternalUrl(
    report?.pdf?.file_url || report?.pdf?.download_url || report?.pdf?.url || report?.pdf_file
  );
}

function getAuthorName(report: StudyReport) {
  return report.author?.name || report.author_name || report.report_created_by_name || '';
}

function getVisibleLockedMessage(report?: StudyReport | null) {
  return (
    report?.locked_message
      ?.replace(/Only a lead can reopen another radiologist['’]s report in the editor\.?/gi, '')
      .trim() || ''
  );
}

function hasDisplayableReportContent(report?: StudyReport | null) {
  return !!(getContent(report) || getPdfUrl(report));
}

function sanitizeReportHtml(html: string) {
  if (!html || typeof window === 'undefined' || !window.DOMParser) {
    return '';
  }

  const document = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');

  document
    .querySelectorAll('script, style, iframe, object, embed, link, meta')
    .forEach(element => element.remove());

  document.querySelectorAll('*').forEach(element => {
    Array.from(element.attributes).forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith('on') || value.startsWith('javascript:')) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return document.body.firstElementChild?.innerHTML || '';
}

function formatDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function StudyReportContent({
  report,
  isLoading = false,
  error,
}: {
  report?: StudyReport;
  isLoading?: boolean;
  error?: string;
}) {
  const sanitizedContent = sanitizeReportHtml(getContent(report));
  const pdfUrl = getPdfUrl(report);
  const authorName = report ? getAuthorName(report) : '';
  const lockedMessage = getVisibleLockedMessage(report);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <div className="text-foreground pr-6 text-base font-semibold">
          {report?.title || 'Study report'}
        </div>
        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs">
          {report?.status && <span>{report.status}</span>}
          {authorName && <span>{authorName}</span>}
          {report?.updated_at && <span>{formatDate(report.updated_at)}</span>}
        </div>
        {lockedMessage && <div className="text-muted-foreground mt-2 text-xs">{lockedMessage}</div>}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground mt-3 min-h-0 flex-1 overflow-y-auto text-sm">
          Loading report...
        </div>
      ) : error ? (
        <div className="text-muted-foreground mt-3 min-h-0 flex-1 overflow-y-auto text-sm">
          {error}
        </div>
      ) : sanitizedContent ? (
        <div
          className="text-foreground mt-3 min-h-0 flex-1 touch-pan-y overflow-auto overscroll-contain pr-1 text-sm leading-6 [overflow-wrap:anywhere] [&_img]:h-auto [&_img]:max-w-full [&_table]:max-w-full"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      ) : (
        <div className="text-muted-foreground mt-3 min-h-0 flex-1 overflow-y-auto text-sm">
          Report content is not available.
        </div>
      )}

      {pdfUrl && (
        <a
          className="text-primary mt-3 inline-flex flex-shrink-0 text-sm font-medium hover:underline"
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open PDF
        </a>
      )}
    </div>
  );
}

async function fetchJson(url: string, headers: Record<string, string>, signal: AbortSignal) {
  const response = await fetch(url, {
    headers,
    credentials: 'include',
    signal,
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'detail' in payload
        ? String((payload as Record<string, unknown>).detail)
        : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

async function fetchReportsForStudy(
  studyId: string,
  headers: Record<string, string>,
  signal: AbortSignal
) {
  const payload = await fetchJson(
    buildUrl('/api/reports/public-by-study/', { study_id: studyId }),
    {
      Accept: 'application/json',
      ...headers,
    },
    signal
  );

  return normalizeBootstrapPayload(payload, studyId);
}

async function fetchReportDetail(
  report: StudyReport,
  headers: Record<string, string>,
  signal: AbortSignal
) {
  const url = report.detail_url
    ? normalizeExternalUrl(report.detail_url)
    : buildUrl(`/api/reports/${report.id}/`);
  const payload = await fetchJson(url, headers, signal);
  return normalizeReportDetailPayload(payload);
}

function PanelStudyReports({ servicesManager }: withAppTypes) {
  const panelRootRef = useRef<HTMLDivElement | null>(null);
  const [isFloatingDialog, setIsFloatingDialog] = useState(false);
  const activeDisplaySets = useActiveViewportDisplaySets();
  const studyIdCandidates = useMemo(
    () => getStudyIdCandidates(activeDisplaySets),
    [activeDisplaySets]
  );
  const [studyId, setStudyId] = useState('');
  const [reports, setReports] = useState<StudyReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState<Record<string, StudyReport>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);
  const [reportDetailError, setReportDetailError] = useState('');
  const [error, setError] = useState('');
  const fetchedReportIdsRef = useRef<Set<string>>(new Set());
  const detailAbortControllerRef = useRef<AbortController | null>(null);

  const headers = useMemo(() => {
    const authorizationHeaders =
      servicesManager?.services?.userAuthenticationService?.getAuthorizationHeader?.() || {};

    return {
      Accept: 'application/json',
      ...authorizationHeaders,
    };
  }, [servicesManager?.services?.userAuthenticationService]);

  useEffect(() => {
    setIsFloatingDialog(!!panelRootRef.current?.closest('.mobile-study-reports-dialog'));
  }, []);

  useEffect(() => {
    fetchedReportIdsRef.current.clear();
    detailAbortControllerRef.current?.abort();
    detailAbortControllerRef.current = null;
    setReportDetailError('');

    if (!studyIdCandidates.length) {
      setStudyId('');
      setReports([]);
      setSelectedReportId(null);
      setError('No study is selected.');
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);
    setError('');

    async function loadReports() {
      let lastError = '';

      for (const candidate of studyIdCandidates) {
        try {
          const payload = await fetchReportsForStudy(candidate, headers, abortController.signal);

          if (abortController.signal.aborted) {
            return;
          }

          setStudyId(payload.studyId || candidate);
          setReports(payload.reports);
          setReportDetails(Object.fromEntries(payload.reports.map(report => [report.id, report])));
          setReportDetailError('');
          fetchedReportIdsRef.current = new Set(
            payload.reports
              .filter(report => hasDisplayableReportContent(report))
              .map(report => report.id)
          );
          setSelectedReportId(payload.reports[0]?.id || null);
          setError(payload.reports.length ? '' : 'No reports for this study.');
          return;
        } catch (loadError) {
          if (abortController.signal.aborted) {
            return;
          }

          lastError = loadError instanceof Error ? loadError.message : 'Unable to load reports.';
        }
      }

      setStudyId(studyIdCandidates[0]);
      setReports([]);
      setSelectedReportId(null);
      setReportDetailError('');
      setError(lastError || 'No reports for this study.');
    }

    loadReports().finally(() => {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    });

    return () => {
      abortController.abort();
      detailAbortControllerRef.current?.abort();
    };
  }, [headers, studyIdCandidates]);

  useEffect(() => {
    setLoadingReportId(null);
  }, [selectedReportId]);

  useEffect(() => {
    return () => {
      detailAbortControllerRef.current?.abort();
    };
  }, []);

  const selectedSummary = reports.find(report => report.id === selectedReportId);
  const selectedReport = selectedReportId
    ? reportDetails[selectedReportId] || selectedSummary
    : undefined;

  const loadReportDetail = async (report: StudyReport) => {
    const currentReport = reportDetails[report.id] || report;

    if (fetchedReportIdsRef.current.has(report.id) || hasDisplayableReportContent(currentReport)) {
      return currentReport;
    }

    detailAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    detailAbortControllerRef.current = abortController;
    setLoadingReportId(report.id);

    try {
      const detail = await fetchReportDetail(report, headers, abortController.signal);
      const mergedReport = {
        ...currentReport,
        ...(detail || {}),
      };

      fetchedReportIdsRef.current.add(report.id);
      setReportDetails(previousDetails => ({
        ...previousDetails,
        [report.id]: mergedReport,
      }));
      setReports(previousReports =>
        previousReports.map(previousReport =>
          previousReport.id === report.id ? { ...previousReport, ...mergedReport } : previousReport
        )
      );

      return mergedReport;
    } finally {
      if (!abortController.signal.aborted) {
        setLoadingReportId(currentLoadingReportId =>
          currentLoadingReportId === report.id ? null : currentLoadingReportId
        );
      }

      if (detailAbortControllerRef.current === abortController) {
        detailAbortControllerRef.current = null;
      }
    }
  };

  const handleSelectReport = async (report: StudyReport) => {
    setSelectedReportId(report.id);
    setReportDetailError('');

    try {
      await loadReportDetail(report);
    } catch (detailError) {
      if (detailError instanceof DOMException && detailError.name === 'AbortError') {
        return;
      }

      setReportDetailError(
        detailError instanceof Error ? detailError.message : 'Unable to open this report.'
      );
    }
  };

  const startMobileDialogResize = (
    event: React.PointerEvent<HTMLDivElement>,
    direction: 'top' | 'corner'
  ) => {
    const dialogElement = event.currentTarget.closest(
      '.mobile-study-reports-dialog'
    ) as HTMLElement | null;

    if (!dialogElement || typeof window === 'undefined') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = dialogElement.getBoundingClientRect();
    const availableWidth = Math.max(160, window.innerWidth - 16);
    const availableHeight = Math.max(220, window.innerHeight - 16);
    const minWidth = Math.min(320, availableWidth);
    const minHeight = Math.min(280, availableHeight);
    const maxWidth = Math.max(minWidth, window.innerWidth - 8);
    const maxHeight = Math.max(minHeight, window.innerHeight - 8);
    const previousUserSelect = document.body.style.userSelect;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();

      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const nextWidth =
        direction === 'corner'
          ? clamp(startRect.width + deltaX, minWidth, maxWidth)
          : startRect.width;
      const nextHeight =
        direction === 'top'
          ? clamp(startRect.height - deltaY, minHeight, maxHeight)
          : clamp(startRect.height + deltaY, minHeight, maxHeight);

      dialogElement.style.width = `${nextWidth}px`;
      dialogElement.style.height = `${nextHeight}px`;
    };

    const stopResize = () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.touchAction = previousTouchAction;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  };

  return (
    <div
      ref={panelRootRef}
      className="study-reports-panel text-foreground flex h-full flex-col overflow-hidden"
    >
      <div
        className={`study-reports-panel__header border-border flex-shrink-0 border-b px-3 py-2 ${
          isFloatingDialog ? 'drag-handle' : ''
        }`}
      >
        {isFloatingDialog && (
          <div
            className="study-reports-panel__resize-handle study-reports-panel__resize-handle--top"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize reports window"
            onPointerDown={event => startMobileDialogResize(event, 'top')}
          />
        )}
        <div className="text-base font-semibold">Study Reports</div>
        {studyId && <div className="text-muted-foreground truncate text-xs">{studyId}</div>}
      </div>
      <div className="study-reports-panel__body flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2">
        {isLoading && (
          <div className="text-muted-foreground px-2 py-3 text-sm">Loading reports...</div>
        )}
        {!isLoading && error && (
          <div className="text-muted-foreground px-2 py-3 text-sm">{error}</div>
        )}
        {!isLoading && reports.length > 0 && (
          <>
            <div className="study-reports-panel__mobile-layout flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="study-reports-panel__list max-h-[38%] flex-shrink-0 space-y-2 overflow-y-auto pr-1">
                {reports.map(report => {
                  const isSelected = report.id === selectedReportId;
                  const authorName = getAuthorName(report);

                  return (
                    <button
                      key={report.id}
                      type="button"
                      className={`border-border w-full rounded-md border px-3 py-2 text-left transition ${
                        isSelected ? 'bg-primary/20 text-primary' : 'bg-muted hover:bg-primary/10'
                      }`}
                      onClick={() => handleSelectReport(report)}
                    >
                      <div className="truncate text-sm font-semibold">
                        {report.title || 'Untitled report'}
                      </div>
                      <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                        {report.status && <span>{report.status}</span>}
                        {authorName && <span>{authorName}</span>}
                        {report.updated_at && <span>{formatDate(report.updated_at)}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedReport && (
                <>
                  <div className="study-reports-panel__mobile-detail border-border mt-3 flex min-h-[220px] flex-1 flex-col overflow-hidden border-t pt-3 md:hidden">
                    <StudyReportContent
                      report={selectedReport}
                      isLoading={loadingReportId === selectedReport.id}
                      error={reportDetailError}
                    />
                  </div>
                  <div className="study-reports-panel__detail border-border mt-3 hidden min-h-0 flex-1 flex-col overflow-hidden border-t pt-3 md:flex">
                    <StudyReportContent
                      report={selectedReport}
                      isLoading={loadingReportId === selectedReport.id}
                      error={reportDetailError}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
      {isFloatingDialog && (
        <div
          className="study-reports-panel__resize-handle study-reports-panel__resize-handle--corner"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize reports window"
          onPointerDown={event => startMobileDialogResize(event, 'corner')}
        />
      )}
    </div>
  );
}

export default PanelStudyReports;
