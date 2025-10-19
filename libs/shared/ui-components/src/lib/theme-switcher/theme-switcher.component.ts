import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AVAILABLE_THEMES, ThemeConfig, ThemeService } from '../themes/ag-grid-themes';

@Component({
  selector: 'lib-theme-switcher',
  standalone: true,
  imports: [CommonModule, MatSelectModule, MatFormFieldModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="theme-switcher-container">
      <mat-form-field appearance="outline" class="theme-selector">
        <mat-label>Grid Theme</mat-label>
        <mat-icon matPrefix>palette</mat-icon>
        <mat-select 
          [value]="selectedTheme" 
          (selectionChange)="onThemeChange($event.value)"
          matTooltip="Select AG Grid theme"
        >
          <mat-option 
            *ngFor="let theme of availableThemes" 
            [value]="theme.name"
            [matTooltip]="theme.description"
          >
            {{ theme.name | titlecase }}
          </mat-option>
        </mat-select>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .theme-switcher-container {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .theme-selector {
      min-width: 150px;
    }
    
    .theme-selector .mat-mdc-form-field {
      font-size: 0.875rem;
    }
    
    :host ::ng-deep .mat-mdc-form-field {
      --mdc-filled-text-field-container-height: 40px;
      --mdc-outlined-text-field-container-height: 40px;
    }
    
    :host ::ng-deep .mat-mdc-select-value {
      font-weight: 500;
    }
  `]
})
export class ThemeSwitcher {
  @Input() selectedTheme = 'dark';
  @Output() themeChanged = new EventEmitter<string>();

  availableThemes: ThemeConfig[] = AVAILABLE_THEMES;

  onThemeChange(themeName: string): void {
    this.selectedTheme = themeName;
    ThemeService.setTheme(themeName);
    this.themeChanged.emit(themeName);
  }
}