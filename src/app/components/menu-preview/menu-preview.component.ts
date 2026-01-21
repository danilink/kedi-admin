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
        <div class="list listPrimeros">
          @for (p of menu.primeros; track p) {
            <div class="item">
              <span class="material-symbols-outlined itemIconSym" aria-hidden="true">fork_spoon</span>
              {{ p }}
            </div>
          }
        </div>
      </div>

      <div class="section">
        <div class="sectionTitle">SEGUNDOS PLATOS</div>
        <div class="list listSegundos">
          @for (s of menu.segundos; track s) {
            <div class="item">
              <span class="material-symbols-outlined itemIconSym" aria-hidden="true">restaurant</span>
              {{ s }}
            </div>
          }
        </div>
      </div>

      <div class="section">
        <div class="sectionTitle">POSTRES CASEROS</div>
        <div class="postresCols">
          <div class="postresCol">
            @for (p of leftPostres(); track p) {
              <div class="postreItem">
                <span class="material-symbols-outlined itemIconSym" aria-hidden="true">shaved_ice</span>
                {{ formatPostre(p) }}
              </div>
            }
          </div>
          <div class="postresCol">
            @for (p of rightPostres(); track p) {
              <div class="postreItem">
                <span class="material-symbols-outlined itemIconSym" aria-hidden="true">shaved_ice</span>
                {{ formatPostre(p) }}
              </div>
            }
          </div>
        </div>
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
      display: flex;
      flex-direction: column;
    }
    .title {
      text-align: center;
      font-family: "Georgia", "Times New Roman", serif;
      font-size: 24pt;
      letter-spacing: 0.3px;
      color: #7a6a58;
      margin: 0 0 2mm;
    }
    .titleText { display: inline; }
    .dish {
      text-align: center;
      font-size: 24pt;
      margin: 6mm 0;
    }
    .menuTitle {
      text-align: center;
      font-family: "Georgia", "Times New Roman", serif;
      font-size: 24pt;
      letter-spacing: 0.3px;
      color: #7a6a58;
      margin: 0 0 8mm;
    }
    .price { margin-left: 6px; }
    .section { margin-bottom: 8mm; }
    .sectionTitle {
      text-align: center;
      font-family: "Georgia", "Times New Roman", serif;
      font-size: 15pt;
      color: #7a6a58;
      margin-bottom: 3mm;
      text-transform: uppercase;
    }
    .list {
      font-size: 14pt;
      line-height: 1.35;
      text-align: center;
      font-weight: 500;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .item {
      margin: 1.2mm 0;
      display: inline-flex;
      align-items: center;
      gap: 2mm;
    }
    .itemIcon {
      font-family: "bootstrap-icons";
      font-style: normal;
      display: inline-block;
      font-size: 12pt;
      color: #7a6a58;
      line-height: 1;
    }
    .itemIconMat {
      font-family: "Material Icons";
      font-size: 13pt;
      color: #7a6a58;
      line-height: 1;
    }
    .itemIconSym {
      font-family: "Material Symbols Outlined";
      font-size: 13pt;
      color: #7a6a58;
      line-height: 1;
    }
    .itemIconBi {
      font-family: "bootstrap-icons";
      font-style: normal;
      display: inline-block;
      font-size: 12pt;
      color: #7a6a58;
      line-height: 1;
    }
    .itemIconSvg {
      width: 4.5mm;
      height: 4.5mm;
      fill: #7a6a58;
      flex: 0 0 auto;
    }
    .postresCols {
      display: grid;
      grid-template-columns: repeat(2, 70mm);
      justify-content: center;
      gap: 0 8mm;
      margin-left: 80px;
      font-size: 13pt;
      line-height: 1.2;
      font-weight: 500;
    }
    .postresCol {
      display: grid;
      gap: 1mm;
      text-align: left;
    }
    .postreItem {
      padding: 0;
      word-break: break-word;
      display: inline-flex;
      align-items: center;
      text-align: left;
      gap: 2mm;
    }
    .postreItem .itemIconSvg {
      width: 4.5mm;
      height: 4.5mm;
      flex: 0 0 4.5mm;
      fill: #7a6a58;
    }

    @media screen {
      .postresCols {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0 24px;
      }
      .postreItem .itemIconSvg {
        width: 16px;
        height: 16px;
        flex: 0 0 16px;
      }
    }
    .footer {
      margin-top: auto;
      text-align: center;
      padding-top: 8mm;
    }
    .reserve {
      font-family: "Georgia", "Times New Roman", serif;
      color: #7a6a58;
      font-size: 13.5pt;
      margin-bottom: 2mm;
    }
    .footLine {
      font-size: 10.5pt;
      margin: 1.5mm 0;
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

  leftPostres = computed(() => {
    const list = this.menu.postres ?? [];
    return list.filter((_, index) => index % 2 === 0);
  });

  rightPostres = computed(() => {
    const list = this.menu.postres ?? [];
    return list.filter((_, index) => index % 2 === 1);
  });

  private eur(value: number) {
    const fixed = value.toFixed(2).replace('.', ',');
    return `${fixed} €`;
  }

  formatPostre(value: string) {
    if (!value) return value;
    const trimmed = value.trimStart();
    if (!trimmed) return value;
    const index = value.length - trimmed.length;
    const first = trimmed[0].toLocaleUpperCase('es-ES');
    return `${value.slice(0, index)}${first}${trimmed.slice(1)}`;
  }
}
