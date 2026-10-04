import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButton, IonChip, IonContent, IonIcon, IonToast } from '@ionic/angular';
import { arrowForwardOutline, calendarOutline, documentTextOutline, femaleOutline, heart, heartOutline, locationOutline, maleOutline, medicalOutline, ellipsisVertical, paw, pawOutline, peopleOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { Animals } from '../animals';

@Component({
  selector: 'app-animal-detail',
  templateUrl: './animal-detail.component.html',
  styleUrl: './animal-detail.component.scss',
  imports: [RouterLink, IonBackButton, IonButton, IonChip, IonContent, IonIcon, IonToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalDetailComponent {
  readonly id = input.required<string>();
  readonly animals = inject(Animals);
  readonly animal = computed(() => this.animals.find(this.id()));
  readonly photoIndex = linkedSignal({ source: this.id, computation: () => 0 });
  readonly message = signal('');
  readonly icons = { arrowForwardOutline, calendarOutline, documentTextOutline, femaleOutline, heart, heartOutline, locationOutline, maleOutline, medicalOutline, ellipsisVertical, paw, pawOutline, peopleOutline, shieldCheckmarkOutline };
}
