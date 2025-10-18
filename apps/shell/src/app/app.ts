import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ShellFeature } from '@trade-platform/shell/feature';

@Component({
  imports: [ShellFeature, RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'Trade Platform';
}
