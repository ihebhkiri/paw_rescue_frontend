import { Component, inject } from '@angular/core';
import { RescuePush } from './features/reports/rescue-push';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly rescuePush = inject(RescuePush);
}
