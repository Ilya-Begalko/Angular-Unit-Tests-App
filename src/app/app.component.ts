import { ChangeDetectionStrategy, Component, VERSION, signal } from '@angular/core';
import { QuotesComponent } from './components/quotes/quotes.component';
import { TestLabComponent } from './components/test-lab/test-lab.component';
import { TestingGuideComponent } from './components/testing-guide/testing-guide.component';

interface NavLink {
  readonly href: string;
  readonly label: string;
}

@Component({
  selector: 'app-root',
  imports: [QuotesComponent, TestingGuideComponent, TestLabComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly title = 'Angular Unit Tests App';
  readonly angularVersion = VERSION.major;
  readonly year = new Date().getFullYear();
  readonly menuOpen = signal(false);

  readonly links: readonly NavLink[] = [
    { href: '#demo', label: 'Приложение' },
    { href: '#how', label: 'Как это работает' },
    { href: '#lab', label: 'Лаборатория' },
  ];

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
