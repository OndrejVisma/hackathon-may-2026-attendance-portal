import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ACCEPTED_MIME, MAX_FILES, MAX_FILE_SIZE_BYTES, isAcceptedMime } from '../../documents/domain/document';

interface PickedFile {
  readonly file: File;
  readonly previewUrl: string | null;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="drop"
      role="button"
      tabindex="0"
      [attr.aria-describedby]="describedBy()"
      [attr.aria-disabled]="disabled()"
      (click)="picker.click()"
      (keydown)="onKey($event)"
      (dragover)="$event.preventDefault()"
      (drop)="onDrop($event)">
      <p>Drop files here or click to pick</p>
      <p id="upload-constraints" class="constraints">
        PDF, PNG or JPEG · up to {{ maxFiles }} files · {{ maxMb }}&nbsp;MB each
      </p>
    </div>
    <input
      #picker
      type="file"
      [accept]="acceptedAttr"
      multiple
      hidden
      [attr.capture]="capture()"
      (change)="onPick($event)" />

    @if (errorMsg(); as err) { <p role="alert" class="err">{{ err }}</p> }

    @if (picked().length > 0) {
      <ul role="list" class="files">
        @for (p of picked(); track p.file.name) {
          <li>
            @if (p.previewUrl) { <img [src]="p.previewUrl" alt="" /> }
            <span class="meta">
              <strong>{{ p.file.name }}</strong>
              <span>{{ formatSize(p.file.size) }}</span>
            </span>
            <button type="button" (click)="remove(p)" [attr.aria-label]="'Remove ' + p.file.name">Remove</button>
          </li>
        }
      </ul>
    }
  `,
  styles: [`
    .drop {
      border: 2px dashed var(--border-default); border-radius: var(--radius-md);
      padding: var(--space-6); text-align: center; cursor: pointer;
      background: var(--surface-sunken); color: var(--text-secondary);
      &:hover { border-color: var(--accent-primary); }
    }
    .constraints { font-size: var(--font-size-caption); color: var(--text-muted); margin: var(--space-2) 0 0 0; }
    .err { color: var(--state-error-fg); }
    .files { list-style: none; padding: 0; margin: var(--space-3) 0 0 0; display: grid; gap: var(--space-2); }
    li {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      background: var(--surface-raised); border-radius: var(--radius-md);
    }
    img { width: 48px; height: 48px; object-fit: cover; border-radius: var(--radius-sm); }
    .meta { display: flex; flex-direction: column; flex: 1; }
    .meta span { font-size: var(--font-size-caption); color: var(--text-muted); }
    button {
      padding: var(--space-1) var(--space-3);
      background: transparent; border: 1px solid var(--border-default);
      border-radius: var(--radius-sm); cursor: pointer; font: inherit; color: var(--text-secondary);
    }
  `],
})
export class FileUploadComponent {
  readonly disabled = input<boolean>(false);
  readonly filesPicked = output<readonly File[]>();

  protected readonly picked = signal<readonly PickedFile[]>([]);
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly acceptedAttr = ACCEPTED_MIME.join(',');
  protected readonly maxFiles = MAX_FILES;
  protected readonly maxMb = MAX_FILE_SIZE_BYTES / 1024 / 1024;

  protected describedBy(): string { return 'upload-constraints'; }

  protected capture = (): string | null => /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'environment' : null;

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).querySelector('input')?.click();
      const picker = document.querySelector<HTMLInputElement>('input[type="file"]');
      picker?.click();
    }
  }

  protected onPick(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.accept(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.accept(Array.from(e.dataTransfer?.files ?? []));
  }

  private accept(files: readonly File[]): void {
    this.errorMsg.set(null);
    const ok: PickedFile[] = [];
    for (const f of files) {
      if (!isAcceptedMime(f.type)) {
        this.errorMsg.set(`"${f.name}" — unsupported type (${f.type || 'unknown'}).`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE_BYTES) {
        this.errorMsg.set(`"${f.name}" too large (${(f.size / 1024 / 1024).toFixed(1)} MB > ${this.maxMb} MB limit).`);
        continue;
      }
      ok.push({ file: f, previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null });
    }
    const next = [...this.picked(), ...ok].slice(0, MAX_FILES);
    if (next.length < this.picked().length + ok.length) {
      this.errorMsg.set(`Only the first ${MAX_FILES} files were kept.`);
    }
    this.picked.set(next);
    this.filesPicked.emit(next.map((p) => p.file));
  }

  protected remove(p: PickedFile): void {
    if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    const next = this.picked().filter((x) => x !== p);
    this.picked.set(next);
    this.filesPicked.emit(next.map((x) => x.file));
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
