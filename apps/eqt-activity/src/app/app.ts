import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ShellFeature } from '@trade-platform/shell/feature';
import { McpConsumerComponent } from './mcp-consumer.component';

@Component({
  imports: [ShellFeature, RouterModule, McpConsumerComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'EQT Activity Platform';
}
