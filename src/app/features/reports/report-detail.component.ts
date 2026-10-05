import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButton, IonContent, IonIcon, IonToast } from '@ionic/angular';
import { chevronBackOutline, location } from 'ionicons/icons';
import { reports } from './reports';

@Component({
  selector: 'app-report-detail',
  templateUrl: './report-detail.component.html',
  styleUrl: './report-detail.component.scss',
  imports: [RouterLink, IonBackButton, IonButton, IonContent, IonIcon, IonToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDetailComponent {
  readonly id = input.required<string>();
  readonly report = computed(() => reports.find(report => report.id === this.id()));
  readonly message = signal('');
  readonly icons = { chevronBackOutline, location };

  participate(): void {
    this.message.set('La participation aux missions n’est pas encore disponible. Aucune demande n’a été envoyée.');
  }
}
