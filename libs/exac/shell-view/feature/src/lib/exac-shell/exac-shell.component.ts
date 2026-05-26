import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { GridView, gridViewQParams } from '@trade-platform/exac/shared/data';

@Component({
  selector: 'tp-exac-shell',
  templateUrl: './exac-shell.component.html',
  styleUrls: ['./exac-shell.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
})
export class ExacShellComponent implements OnInit, OnDestroy {
  /** Pass the cancel-and-adjust service URL from the host application. */
  @Input() public cancelAndAdjustServiceUrl = '/api/xa/service/cancel/%TYPE%';

  /** Whether the user is authorized — default true for POC; replace with real auth guard. */
  public readonly isAuthorized = signal(true);

  public isExecutionsContext = false;

  public constructor(
    private readonly titleService: Title,
    private readonly route: ActivatedRoute,
  ) {}

  public ngOnInit(): void {
    this.isExecutionsContext =
      this.route.snapshot.queryParamMap.get(gridViewQParams) === GridView.Executions;
    this.titleService.setTitle(
      this.isExecutionsContext ? 'Block Executions' : 'Fund Executions',
    );
  }

  public ngOnDestroy(): void {
    // Clean up if needed
  }
}
