import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

export interface CancelledByCellParams extends ICellRendererParams {
  getPersonService: () => PersonService;
}

interface Person {
  id: string;
  fullName: string;
  initials: string;
}

interface PersonService {
  getPersonById(id: string): Person | undefined;
  getAllPersons(): Person[];
}

@Component({
  selector: 'lib-cancelled-by-cell',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  template: `
    <span 
      *ngIf="displayData; else naTemplate"
      class="cancelled-by-initials"
      [matTooltip]="displayData.fullName"
      matTooltipPosition="above"
      matTooltipClass="custom-tooltip"
    >
      {{ displayData.initials }}
    </span>
    <ng-template #naTemplate>
      <span style="color: #9ca3af;">N/A</span>
    </ng-template>
  `,
  styles: [`
    .cancelled-by-initials {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.75rem;
      cursor: help;
      display: inline-block;
      min-width: 24px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
      transition: all 0.2s ease-in-out;
    }
    
    .cancelled-by-initials:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(99, 102, 241, 0.4);
    }
    
    :host ::ng-deep .custom-tooltip {
      background-color: #1f2937;
      color: white;
      font-size: 0.875rem;
      border-radius: 6px;
      padding: 8px 12px;
    }
  `]
})
export class CancelledByCellComponent implements ICellRendererAngularComp, OnInit {
  params!: CancelledByCellParams;
  displayData: { initials: string; fullName: string } | null = null;

  agInit(params: CancelledByCellParams): void {
    this.params = params;
    this.updateDisplayData();
  }

  ngOnInit(): void {
    this.updateDisplayData();
  }

  refresh(params: CancelledByCellParams): boolean {
    this.params = params;
    this.updateDisplayData();
    return true;
  }

  private updateDisplayData(): void {
    const trade = this.params.data;
    
    if (!trade || trade.status !== 'CANCELLED' || !trade.cancelledBy) {
      this.displayData = null;
      return;
    }

    const personService = this.params.getPersonService();
    const person = personService.getPersonById(trade.cancelledBy);
    
    if (!person) {
      this.displayData = {
        initials: trade.cancelledBy,
        fullName: `Unknown (${trade.cancelledBy})`
      };
      return;
    }
    
    this.displayData = {
      initials: person.initials,
      fullName: person.fullName
    };
  }
}