import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class McpServerService {
  private baseUrl = 'http://localhost:4000'; // MCP HTTP REST server
  private repoId = 'trade-platform';

  constructor(private http: HttpClient) {}

  searchCodebase(query: string, topK = 10): Observable<any> {
    return this.http.post(`${this.baseUrl}/search`, {
      repo_id: this.repoId,
      query,
      top_k: topK,
    });
  }

  getUiAnchors(route?: string): Observable<any> {
    const params: Record<string, string> = { repoId: this.repoId };
    if (route) params['route'] = route;
    return this.http.get(`${this.baseUrl}/ui-anchors`, { params });
  }

  /**
   * Ask the OpenAI-powered agent to interpret the query and return
   * exactly which Angular component selectors are relevant.
   */
  agent(query: string, liveTags: string[]): Observable<{ selectors: string[]; explanation: string; steps?: { selector: string; title: string; text: string; action?: { type: string; target?: string; instruction: string; event?: string } }[]; fallback?: boolean }> {
    return this.http.post<{ selectors: string[]; explanation: string; steps?: { selector: string; title: string; text: string; action?: { type: string; target?: string; instruction: string; event?: string } }[]; fallback?: boolean }>(`${this.baseUrl}/agent`, {
      repo_id: this.repoId,
      query,
      live_tags: liveTags,
    });
  }
}
