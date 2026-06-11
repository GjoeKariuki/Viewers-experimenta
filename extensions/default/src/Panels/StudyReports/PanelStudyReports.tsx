import React, { useEffect, useMemo, useState } from 'react';
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
  pdf_file?: string | null;
  pdf?: {
    file_url?: string | null;
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

function getReportConfig() {
  if (typeof window === 'undefined') {
    return {};
  }

  return (
    (window as any).OHIFStudyReports ||
    (window as any).studyReports ||
    (window as any).config?.studyReports ||
    {}
  );
}

function buildUrl(path: string, params?: Record<string, string>) {
  const config = getReportConfig();
  const baseUrl = config.apiBaseUrl || window.location.origin;
  const url = new URL(path, baseUrl);

  Object.entries(params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

function normalizeReport(payload: unknown): StudyReport | null {
  const record = asRecord(payload);
  const id = pickString(record, 'id', 'report_id');

  if (!id) {
    return null;
  }

  const author = asRecord(record?.author);

  return {
    id,
    title: pickString(record, 'title') ?? null,
    study_id: pickString(record, 'study_id', 'studyId') ?? null,
    status: pickString(record, 'status') ?? null,
    content: pickString(record, 'content') ?? null,
    rich_text_field: pickString(record, 'rich_text_field') ?? null,
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
    pdf_file: pickString(record, 'pdf_file') ?? null,
    pdf: asRecord(record?.pdf)
      ? {
          file_url: pickString(asRecord(record?.pdf), 'file_url'),
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
  return report?.pdf?.file_url || report?.pdf_file || '';
}

function getAuthorName(report: StudyReport) {
  return report.author?.name || report.author_name || report.report_created_by_name || '';
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
  try {
    const payload = await fetchJson(
      buildUrl('/api/reports/editor-bootstrap/', { study_id: studyId }),
      headers,
      signal
    );
    const normalized = normalizeBootstrapPayload(payload, studyId);

    if (normalized.reports.length) {
      return normalized;
    }
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
  }

  const legacyPayload = await fetchJson(
    buildUrl(`/medireports/editor/check_exists/${encodeURIComponent(studyId)}/`),
    headers,
    signal
  );

  return normalizeLegacyPayload(legacyPayload, studyId);
}

async function fetchReportDetail(
  reportId: string,
  headers: Record<string, string>,
  signal: AbortSignal
) {
  const payload = await fetchJson(buildUrl(`/api/reports/${reportId}/`), headers, signal);
  return normalizeReport(payload);
}

function PanelStudyReports({ servicesManager }: withAppTypes) {
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
  const [error, setError] = useState('');

  const headers = useMemo(() => {
    const authorizationHeaders =
      servicesManager.services.userAuthenticationService?.getAuthorizationHeader?.() || {};

    return {
      Accept: 'application/json',
      ...authorizationHeaders,
    };
  }, [servicesManager.services.userAuthenticationService]);

  useEffect(() => {
    if (!studyIdCandidates.length) {
      setStudyId('');
      setReports([]);
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
          setReportDetails(
            payload.activeReport ? { [payload.activeReport.id]: payload.activeReport } : {}
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
      setError(lastError || 'No reports for this study.');
    }

    loadReports().finally(() => {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [headers, studyIdCandidates]);

  useEffect(() => {
    if (!selectedReportId || reportDetails[selectedReportId]) {
      return;
    }

    const abortController = new AbortController();
    setLoadingReportId(selectedReportId);

    fetchReportDetail(selectedReportId, headers, abortController.signal)
      .then(report => {
        if (!report || abortController.signal.aborted) {
          return;
        }

        setReportDetails(current => ({
          ...current,
          [report.id]: report,
        }));
      })
      .catch(() => {
        // A locked in-progress report may be visible as a summary but not readable.
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoadingReportId(null);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [headers, reportDetails, selectedReportId]);

  const selectedSummary = reports.find(report => report.id === selectedReportId);
  const selectedReport = selectedReportId
    ? reportDetails[selectedReportId] || selectedSummary
    : undefined;
  const selectedContent = getContent(selectedReport);
  const selectedPdfUrl = getPdfUrl(selectedReport);
  const sanitizedContent = sanitizeReportHtml(selectedContent);

  return (
    <div className="text-foreground flex h-full flex-col overflow-hidden">
      <div className="border-border flex-shrink-0 border-b px-3 py-2">
        <div className="text-base font-semibold">Study Reports</div>
        {studyId && <div className="text-muted-foreground truncate text-xs">{studyId}</div>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-2">
        {isLoading && (
          <div className="text-muted-foreground px-2 py-3 text-sm">Loading reports...</div>
        )}
        {!isLoading && error && (
          <div className="text-muted-foreground px-2 py-3 text-sm">{error}</div>
        )}
        {!isLoading && reports.length > 0 && (
          <>
            <div className="space-y-2">
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
                    onClick={() => setSelectedReportId(report.id)}
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
              <div className="border-border mt-3 border-t pt-3">
                <div className="text-sm font-semibold">
                  {selectedReport.title || 'Untitled report'}
                </div>
                {selectedReport.locked_message && (
                  <div className="text-muted-foreground mt-2 text-xs">
                    {selectedReport.locked_message}
                  </div>
                )}
                {loadingReportId === selectedReport.id && (
                  <div className="text-muted-foreground mt-3 text-sm">Loading report...</div>
                )}
                {sanitizedContent ? (
                  <div
                    className="text-foreground mt-3 max-w-none overflow-hidden text-sm leading-6"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  />
                ) : (
                  loadingReportId !== selectedReport.id && (
                    <div className="text-muted-foreground mt-3 text-sm">
                      Report content is not available.
                    </div>
                  )
                )}
                {selectedPdfUrl && (
                  <a
                    className="text-primary mt-3 inline-flex text-sm font-medium hover:underline"
                    href={selectedPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open PDF
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PanelStudyReports;
