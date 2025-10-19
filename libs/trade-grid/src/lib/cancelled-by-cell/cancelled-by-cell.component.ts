import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule],
  template: `
    <span 
      *ngIf="displayData; else naTemplate"
      class="cancelled-by-initials"
      [title]="displayData.fullName"
      [style]="initialsStyle"
    >
      {{ displayData.initials }}
    </span>
    <ng-template #naTemplate>
      <span style="color: #9ca3af;">N/A</span>
    </ng-template>
  `,
  styles: [`
    .cancelled-by-initials {
      background: #e5e7eb;
      color: #374151;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      cursor: help;
      display: inline-block;
    }
  `]
})
export class CancelledByCellComponent implements ICellRendererAngularComp, OnInit {
  params!: CancelledByCellParams;
  displayData: { initials: string; fullName: string } | null = null;
  
  initialsStyle = {
    background: '#e5e7eb',
    color: '#374151',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '600',
    cursor: 'help',
    display: 'inline-block'
  };

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