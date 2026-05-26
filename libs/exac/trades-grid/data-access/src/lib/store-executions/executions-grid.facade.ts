import { Injectable, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { createExecutionsGridState } from './executions-grid.state';
import { TradeActivityService } from '../services/trade-activity.service';
import { ExecutionSearchRequest } from '@trade-platform/exac/trades-grid/data';
import { ExecutionModel } from '@trade-platform/exac/shared/data';

@Injectable({ providedIn: 'root' })
export class ExecutionsGridFacade {
  private readonly service = inject(TradeActivityService);
  private readonly state = createExecutionsGridState();

  public readonly executions = this.state.executions;
  public readonly isLoadingData = this.state.isLoadingData;
  public readonly isLoaded = this.state.isLoaded;
  public readonly error = this.state.error;

  public loadExecutions(request?: ExecutionSearchRequest): void {
    this.state.setLoading();
    this.service
      .getExecutions(request)
      .pipe(
        catchError((err) => {
          const msg = err?.message ?? 'Unknown error loading executions';
          this.state.setError(msg);
          return of([] as ExecutionModel[]);
        }),
      )
      .subscribe((executions) => {
        if (executions.length > 0 || !this.state.error()) {
          this.state.setExecutions(executions);
        }
      });
  }

  public clearExecutions(): void {
    this.state.clearExecutions();
  }
}
