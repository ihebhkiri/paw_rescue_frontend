import { ChangeDetectionStrategy, Component, computed, inject, input, signal, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { IonBackButton, IonButton, IonContent, IonAlert } from '@ionic/angular';
import { finalize, Subscription } from 'rxjs';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../auth/service/auth';
import { mapsUrl, ReportDetail, Reports, statusLabel } from './reports';

@Component({
  selector: 'app-report-detail', templateUrl: './report-detail.component.html', styleUrl: './rescue.scss',
  imports: [DatePipe, RouterLink, IonBackButton, IonButton, IonContent, IonAlert], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDetailComponent implements OnDestroy {
  readonly id = input.required<string>();
  private readonly api = inject(Reports);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private request = new Subscription();
  readonly report = signal<ReportDetail | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly confirming = signal(false);
  readonly confirmingCompletion = signal(false);
  readonly canComplete = computed(() => {
    const mission = this.report()?.mission;
    return !!mission?.assigned_to_me && ['accepted', 'en_route', 'on_site'].includes(mission.status);
  });
  readonly completeButtons = [
    { text: 'Garder active', role: 'cancel' },
    { text: 'Confirmer le secours', handler: () => this.complete() },
  ];
  readonly statusLabel = statusLabel;
  readonly itinerary = computed(() => this.report() ? mapsUrl(this.report()!) : '');
  readonly canRespond = computed(() => this.report()?.mission?.status === 'open' && this.report()?.mission?.response === 'pending');
  readonly map = computed(() => {
    const point = this.report();
    if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return null;
    const lat = point.latitude, lon = point.longitude;
    const bbox = `${Math.max(-180, lon - .01)},${Math.max(-90, lat - .01)},${Math.min(180, lon + .01)},${Math.min(90, lat + .01)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`);
  });
  readonly acceptButtons = [
    { text: 'Annuler', role: 'cancel' },
    { text: 'Accepter', handler: () => this.respond('accepted') },
  ];
  ionViewWillEnter(): void { this.load(); }
  ionViewWillLeave(): void { this.request.unsubscribe(); this.request = new Subscription(); this.confirming.set(false); this.confirmingCompletion.set(false); }
  ngOnDestroy(): void { this.ionViewWillLeave(); }
  load(): void {
    this.loading.set(true); this.error.set(''); this.report.set(null);
    this.request.add(this.api.detail(this.id()).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: value => this.report.set(value), error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
    }));
  }
  respond(response: 'accepted' | 'refused'): void {
    const mission = this.report()?.mission;
    if (!mission || this.saving() || !this.canRespond()) return;
    this.saving.set(true); this.error.set('');
    this.request.add(this.api.respond(mission.id, response).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { if (response === 'refused') void this.router.navigateByUrl('/signalements'); else this.load(); },
      error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
    }));
  }
  complete(): void {
    const mission = this.report()?.mission;
    if (!mission || this.saving() || !this.canComplete()) return;
    this.saving.set(true); this.error.set('');
    this.request.add(this.api.complete(mission.id).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.load(),
      error: (error: unknown) => this.error.set(this.auth.errorMessage(error)),
    }));
  }
}
