import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerificationComponent } from './verification.component';

describe('VerificationComponent', () => {
  let fixture: ComponentFixture<VerificationComponent>;
  let component: VerificationComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VerificationComponent] }).compileComponents();
    fixture = TestBed.createComponent(VerificationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('role', 'VETERINARIAN');
    fixture.detectChanges();
  });

  function selectFile(file: File): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type=file]');
    Object.defineProperty(input, 'files', { configurable: true, value: { item: () => file } });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  for (const role of ['VETERINARIAN', 'SHELTER'] as const) {
    it(`validates ${role} and emits confirmation only in preview`, () => {
      fixture.componentRef.setInput('role', role);
      fixture.detectChanges();
      let confirmations = 0;
      const submissions: FormData[] = [];
      component.submitted.subscribe(data => submissions.push(data));
      component.confirmed.subscribe(() => confirmations++);
      component.submit();
      expect(confirmations).toBe(0);
      expect(component.documentError()).toContain('justificatif');
      for (const field of component.fields()) {
        field.control.setValue(field.options?.[0] ?? (field.type === 'tel' ? '+216 20 123 456' : field.type === 'email' ? 'contact@example.com' : 'Information professionnelle'));
      }
      selectFile(new File(['document'], 'proof.pdf', { type: 'application/pdf' }));
      component.submit();
      expect(confirmations).toBe(0);
      expect(submissions).toHaveLength(1);
      expect(submissions[0].get(role === 'SHELTER' ? 'name' : 'license_number')).toBe('Information professionnelle');
      expect(submissions[0].get(role === 'SHELTER' ? 'official_email' : 'clinic_name')).toBe(role === 'SHELTER' ? 'contact@example.com' : 'Information professionnelle');
      expect(submissions[0].get('verification_document')).toBeInstanceOf(File);
      fixture.componentRef.setInput('preview', true);
      fixture.detectChanges();
      const phone = component.fields().find(field => field.name === 'phone')!;
      phone.control.setValue('123');
      component.submit();
      expect(confirmations).toBe(0);
      phone.control.setValue('20123456');
      component.submit();
      expect(confirmations).toBe(1);
    });
  }

  it('rejects invalid files and clears the proof on role change', () => {
    selectFile(new File(['bad'], 'proof.exe', { type: 'application/octet-stream' }));
    expect(component.document()).toBeNull();
    expect(component.documentError()).toContain('PDF, JPG ou PNG');
    selectFile(new File([], 'empty.pdf', { type: 'application/pdf' }));
    expect(component.document()).toBeNull();
    selectFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }));
    expect(component.documentError()).toContain('5 Mo');
    selectFile(new File(['document'], 'proof.pdf', { type: 'application/pdf' }));
    expect(component.document()?.name).toBe('proof.pdf');
    fixture.componentRef.setInput('role', 'SHELTER');
    fixture.detectChanges();
    expect(component.document()).toBeNull();
    expect(component.fields()).toHaveLength(8);
  });

  it('binds Ionic input/select events and disables every control while submitting', () => {
    const page: HTMLElement = fixture.nativeElement;
    const input = page.querySelector<HTMLIonInputElement>('#verification-orderNumber')!;
    input.value = '12345';
    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value: input.value } }));
    input.dispatchEvent(new CustomEvent('ionBlur'));
    expect(component.fields()[0].control.value).toBe('12345');
    expect(component.fields()[0].control.touched).toBe(true);
    const select = page.querySelector<HTMLIonSelectElement>('#verification-governorate')!;
    select.value = 'Tunis';
    select.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'Tunis' } }));
    expect(component.fields()[1].control.value).toBe('Tunis');
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
    expect(select.disabled).toBe(true);
    expect(page.querySelector<HTMLIonButtonElement>('ion-button.primary')!.disabled).toBe(true);
    expect(page.querySelector<HTMLInputElement>('input[type=file]')!.matches(':disabled')).toBe(true);
    fixture.componentRef.setInput('busy', false);
    fixture.detectChanges();
    expect(input.disabled).toBe(false);
    expect(select.disabled).toBe(false);
    expect(component.fields()[0].control.value).toBe('12345');
    expect(component.fields()[1].control.value).toBe('Tunis');
  });
});
