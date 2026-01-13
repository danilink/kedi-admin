import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DayMenu, MenuSettings } from '../../models/menu.models';

@Component({
  selector: 'app-menu-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sheet">
      <div class="title">
        <span class="titleText">PLATO DEL DÍA</span>
        @if (platoPrice()) { <span class="price">{{ platoPrice() }}</span> }
      </div>
      <div class="dish">{{ menu.platoDelDia }}</div>

      <div class="menuTitle">
        <span class="titleText">MENÚ</span>
        @if (menuPrice()) { <span class="price">{{ menuPrice() }}</span> }
      </div>

      <div class="section">
        <div class="sectionTitle">PRIMEROS PLATOS</div>
        <div class="list">
          @for (p of menu.primeros; track p) { <div class="item">- {{ p }}</div> }
        </div>
      </div>

      <div class="section">
        <div class="sectionTitle">SEGUNDOS PLATOS</div>
        <div class="list">
          @for (s of menu.segundos; track s) { <div class="item">- {{ s }}</div> }
        </div>
      </div>

      <div class="section">
        <div class="sectionTitle">POSTRES CASEROS</div>
        <div class="postres">{{ menu.postres.join(', ') }}</div>
      </div>

      <div class="footer">
        <div class="reserve">RESERVA TU MENÚ EN EL TLF: {{ menu.telefono }}</div>
        @for (line of settings.footerLines; track line) {
          <div class="footLine">{{ line }}</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sheet {
      width: 210mm;
      height: 297mm;
      padding: 18mm 16mm 14mm;
      box-sizing: border-box;
      background: #fff;
      color: #111;
      font-family: "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
    }
    .title {
      text-align: center;
      font-family: "Georgia", "Times New Roman", serif;
      font-weight: 600;
      font-size: 16pt;
      letter-spacing: 0.3px;
      color: #7a6a58;
      margin: 0 0 2mm;
    }
    .titleText { display: inline; }
    .dish {
      text-align: center;
      font-weight: 700;
      font-size: 18pt;
      margin-bottom: 3mm;
    }
    .menuTitle {
      text-align: center;
      font-family: "Georgia", "Times New Roman", serif;
      font-weight: 600;
      font-size: 16pt;
      letter-spacing: 0.3px;
      color: #7a6a58;
      margin: 0 0 8mm;
    }
    .price { margin-left: 6px; }
    .section { margin-bottom: 8mm; }
    .sectionTitle {
      text-align: center;
      font-family: "Georgia", "Times New Roman", serif;
      font-weight: 600;
      font-size: 12pt;
      color: #7a6a58;
      margin-bottom: 3mm;
      text-transform: uppercase;
    }
    .list {
      font-size: 12pt;
      line-height: 1.35;
      text-align: center;
      font-weight: 700;
    }
    .item { margin: 1.2mm 0; }
    .postres {
      text-align: center;
      font-size: 12pt;
      line-height: 1.35;
      font-weight: 700;
    }
    .footer {
      margin-top: 8mm;
      text-align: center;
    }
    .reserve {
      font-family: "Georgia", "Times New Roman", serif;
      color: #7a6a58;
      font-size: 10.5pt;
      font-weight: 600;
      margin-bottom: 2mm;
    }
    .footLine {
      font-size: 10.5pt;
      margin: 1.5mm 0;
      font-weight: 700;
    }
    @media print { .sheet { box-shadow: none; margin: 0; } }
    @page { size: A4; margin: 0; }
  `],
})
export class MenuPreviewComponent {
  @Input({ required: true }) menu!: DayMenu;
  @Input({ required: true }) settings!: MenuSettings;

  platoPrice = computed(() => {
    const p = this.menu.precioPlatoDelDia;
    return p == null ? '' : this.eur(p);
  });

  menuPrice = computed(() => {
    const p = this.menu.precioMenu;
    return p == null ? '' : this.eur(p);
  });

  private eur(value: number) {
    const fixed = value.toFixed(2).replace('.', ',');
    return `${fixed} €`;
  }
}
