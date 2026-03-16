import { Component, OnInit } from '@angular/core';
import { AppInitService } from '../services/app-init.service';

@Component({
  selector: 'app-startup',
  standalone: true,
  template: `
    <main class="startup-wrap" role="main" aria-label="Startup Screen">
      <section class="startup-card">
        <h1>TKKS</h1>
        <p>Opening assigned website in browser...</p>
        <button type="button" (click)="reopenWebsite()">Open Again</button>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .startup-wrap {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      background: linear-gradient(160deg, #f0f5ff 0%, #eef2ff 45%, #f8f2ff 100%);
      font-family: "Montserrat", "Noto Sans", "Segoe UI", sans-serif;
      color: #27335f;
      padding: 16px;
      box-sizing: border-box;
    }

    .startup-card {
      width: 100%;
      max-width: 360px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(67, 92, 180, 0.15);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 14px 32px rgba(52, 72, 142, 0.18);
    }

    .startup-card h1 {
      margin: 0 0 8px;
      font-size: 1.35rem;
      font-weight: 800;
    }

    .startup-card p {
      margin: 0 0 14px;
      color: #53639b;
      line-height: 1.4;
      font-size: 0.95rem;
    }

    .startup-card button {
      border: 0;
      border-radius: 999px;
      padding: 10px 18px;
      background: #4c71df;
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }
  `],
})
export class StartupPage implements OnInit {
  constructor(private readonly appInitService: AppInitService) {}

  async ngOnInit(): Promise<void> {
    await this.appInitService.initialize({ openWebsite: true });
  }

  async reopenWebsite(): Promise<void> {
    await this.appInitService.reloadWebsite();
  }
}

