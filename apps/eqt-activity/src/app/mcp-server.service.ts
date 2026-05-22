import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

export const REPO_IDS = {
  TRADE_PLATFORM: 'trade-platform',
  AG_GRID: 'codeAG-grid',
} as const;

export type RepoId = (typeof REPO_IDS)[keyof typeof REPO_IDS];

export interface AgentResponse {
  selectors: string[];
  explanation: string;
  steps?: {
    selector: string;
    title: string;
    text: string;
    action?: { type: string; target?: string; instruction: string; event?: string };
  }[];
  fallback?: boolean;
}

@Injectable({ providedIn: 'root' })
export class McpServerService {
  private baseUrl = 'http://localhost:4000';

  constructor(private http: HttpClient) {}

  searchCodebase(query: string, topK = 10, repoId: RepoId = REPO_IDS.TRADE_PLATFORM): Observable<any> {
    return this.http.post(`${this.baseUrl}/search`, {
      repo_id: repoId,
      query,
      top_k: topK,
    });
  }

  searchAll(query: string, topK = 10): Observable<any[]> {
    return forkJoin([
      this.searchCodebase(query, topK, REPO_IDS.TRADE_PLATFORM),
      this.searchCodebase(query, topK, REPO_IDS.AG_GRID),
    ]);
  }

  getUiAnchors(route?: string, repoId: RepoId = REPO_IDS.TRADE_PLATFORM): Observable<any> {
    const params: Record<string, string> = { repoId };
    if (route) params['route'] = route;
    return this.http.get(`${this.baseUrl}/ui-anchors`, { params });
  }

  agent(query: string, liveTags: string[], repoId: RepoId = REPO_IDS.TRADE_PLATFORM): Observable<AgentResponse> {
    return this.http.post<AgentResponse>(`${this.baseUrl}/agent`, {
      repo_id: repoId,
      query,
      live_tags: liveTags,
    });
  }

  // Exact AG Grid API terms — high confidence
  private static readonly AG_GRID_EXACT = /ag-grid|agGrid|col-?def|row-?model|cell-?renderer|grid-?api|column-?api|row-?group|aggFunc|ag-column|ag-row|AllCommunityModule|AllEnterpriseModule|themeQuartz|themeAlpine|themeBalham/i;

  // Natural language grid terms — only matched against the user query
  private static readonly GRID_QUERY_TERMS = /\b(grid|column|columns|row|rows|cell|cells|render|renderer|filter|filtering|sort|sorting|pagination|paginate|header|headers|grouping|pinned|editable|editing|value\s*formatter|value\s*getter|tooltip|selection|checkbox|infinite\s*scroll|virtual\s*scroll|datasource|overlay)\b/i;

  private isAgGridRelated(response: AgentResponse, query: string): boolean {
    // Check query for natural grid language
    if (McpServerService.GRID_QUERY_TERMS.test(query)) return true;
    // Check query and response for exact AG Grid API terms
    if (McpServerService.AG_GRID_EXACT.test(query)) return true;
    if (response.selectors.some(s => McpServerService.AG_GRID_EXACT.test(s))) return true;
    if (McpServerService.AG_GRID_EXACT.test(response.explanation)) return true;
    return (response.steps ?? []).some(s =>
      McpServerService.AG_GRID_EXACT.test(s.selector) || McpServerService.AG_GRID_EXACT.test(s.text)
    );
  }

  private mergeResponses(primary: AgentResponse, secondary: AgentResponse): AgentResponse {
    return {
      selectors: [...new Set([...primary.selectors, ...secondary.selectors])],
      explanation: [primary.explanation, secondary.explanation].filter(Boolean).join('\n\n'),
      steps: [...(primary.steps ?? []), ...(secondary.steps ?? [])],
      fallback: primary.fallback && secondary.fallback,
    };
  }

  agentSmart(query: string, liveTags: string[]): Observable<AgentResponse> {
    return this.agent(query, liveTags, REPO_IDS.TRADE_PLATFORM).pipe(
      switchMap(platformResponse => {
        if (this.isAgGridRelated(platformResponse, query)) {
          return this.agent(query, liveTags, REPO_IDS.AG_GRID).pipe(
            map(agGridResponse => this.mergeResponses(platformResponse, agGridResponse))
          );
        }
        return of(platformResponse);
      })
    );
  }
}
