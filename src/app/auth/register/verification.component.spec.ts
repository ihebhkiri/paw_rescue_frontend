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
      expect(component.feedback()).toContain('aucun document n’a été envoyé');
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
    selectFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }));
    expect(component.documentError()).toContain('10 Mo');
    selectFile(new File(['document'], 'proof.pdf', { type: 'application/pdf' }));
    expect(component.document()?.name).toBe('proof.pdf');
    fixture.componentRef.setInput('role', 'SHELTER');
    fixture.detectChanges();
    expect(component.document()).toBeNull();
    expect(component.fields()).toHaveLength(8);
  });
});
