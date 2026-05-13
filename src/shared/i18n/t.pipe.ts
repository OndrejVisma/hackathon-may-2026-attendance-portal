import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

// Translate pipe. Re-runs when locale signal changes thanks to standalone
// pipes participating in change detection via the impure flag.
@Pipe({
  name: 't',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, params?: Readonly<Record<string, string | number>>): string {
    // Touch the signal to subscribe pipe changes to locale flips.
    this.i18n.locale();
    return this.i18n.t(key, params);
  }
}
