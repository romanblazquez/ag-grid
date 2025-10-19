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
    
    // Check if this is a group row
    if (this.params.node && this.params.node.group) {
      // For group rows, display the group key which should be the person's name
      const groupKey = this.params.value;
      if (groupKey) {
        // Extract initials from the full name (e.g., "John Smith" -> "JS")
        const nameParts = groupKey.split(' ');
        const initials = nameParts.map((part: string) => part.charAt(0)).join('');
        this.displayData = {
          initials: initials,
          fullName: groupKey
        };
      } else {
        this.displayData = null;
      }
      return;
    }
    
    // Handle regular data rows
    if (!trade || trade.status !== 'CANCELLED' || !trade.cancelledBy) {
      this.displayData = null;
      return;
    }

    // Try to get the person service, with fallback
    let personService: PersonService | null = null;
    
    try {
      if (this.params.getPersonService && typeof this.params.getPersonService === 'function') {
        personService = this.params.getPersonService();
      }
    } catch (error) {
      console.warn('Could not get person service from params:', error);
    }
    
    // If no service available, use fallback
    if (!personService) {
      personService = this.getDefaultPersonService();
    }
    
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

  private getDefaultPersonService(): PersonService {
    const persons = [
      { id: 'user1', fullName: 'John Smith', initials: 'JS' },
      { id: 'user2', fullName: 'Jane Doe', initials: 'JD' },
      { id: 'user3', fullName: 'Michael Johnson', initials: 'MJ' },
      { id: 'user4', fullName: 'Sarah Wilson', initials: 'SW' },
      { id: 'user5', fullName: 'David Brown', initials: 'DB' },
    ];
    
    return {
      getPersonById: (id: string) => persons.find(p => p.id === id),
      getAllPersons: () => persons
    };
  }
}