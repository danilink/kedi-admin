import { MenuState, Weekday } from '../models/menu.models';

const footerLinesDefault: string[] = [
  'NO ENTRAN DOS SEGUNDOS COMO MENÚ',
  'LOS PEDIDOS TIENEN QUE ESPERAR SU TURNO',
  'EL MENÚ ESTÁ PREPARADO A PARTIR DE LAS 12.30h',
];

function day(
  weekday: Weekday,
  platoDelDia: string,
  precioPlatoDelDia: number,
  precioMenu: number,
  primeros: string[],
  segundos: string[],
  postres: string[],
  telefono: string
) {
  return {
    weekday,
    platoDelDia,
    precioPlatoDelDia,
    precioMenu,
    primeros,
    segundos,
    postres,
    telefono,
    notas: '',
  };
}

export const DEFAULT_STATE: MenuState = {
  version: 1,
  days: {
    Lunes: day(
      'Lunes',
      'Arroz de campo',
      5.2,
      11.5,
      [
        'Arroz de campo',
        'Guiso de patatas con calamar y langostinos',
        'Calabacín relleno',
        'Raviolis de carne en salsa',
        'Ensalada alemana',
      ],
      [
        'Librillo de pavo y queso',
        'Pechuga de pollo con salsa de champiñones',
        'Calamares a la andaluza',
        'Huevos fritos con bacon',
      ],
      [
        'Yogurt con mermelada de frambuesa',
        'Profiteroles con chocolate',
        'Cóctel de frutas',
        'melón',
        'pudin casero',
        'tarta de wisky',
        'tarta de zanahoria casera',
        ',.etc',
      ],
      '637 690 946 / 91 227 7899'
    ),
    Martes: day(
      'Martes',
      'Lentejas caseras',
      5.2,
      11.5,
      [
        'Lentejas caseras',
        'Fideuá de marisco y pollo',
        'Espinacas a la crema',
        'Raviolis de carne en salsa',
        'vichyssoise',
      ],
      ['Pollo con tomate', 'Lenguado al horno', 'Cachopo', 'Huevos con lomo'],
      [
        'cóctel de frutas',
        'natillas caseras',
        'melón',
        'tarta limón',
        'profiteroles con chocolate',
        'tarta de wisky',
        'yogurt con mermelada de frambuesa, tarta de chocolate casera',
        'flan casero, .. etc',
      ],
      '637 690 946 / 91 227 7899'
    ),
    'Miércoles': day(
      'Miércoles',
      'Cocido madrileño (garbanzos, carne y verdura)',
      5.2,
      11.5,
      [
        'Sopa de cocido con fideos',
        'Espaguetis a la carbonara',
        'Coliflor a la romana',
        'Ensalada de lechuga con salmón',
      ],
      [
        'Cocido (garbanzos, carne y verdura)',
        'Merluza rebozada',
        'Pollo relleno',
        'Redondo en salsa',
      ],
      [
        'Macedonia de frutas',
        'Melón',
        'Tarta de manzana',
        'Tarta de maracuyá',
        'Natillas caseras',
        'pudin casero',
        'flan casero',
        'yogurt con mermelada de frambuesa',
        'etc',
      ],
      '637 690 946 / 91 227 7899'
    ),
    Jueves: day(
      'Jueves',
      'Paella mixta de pollo y mariscos',
      5.2,
      11.5,
      [
        'Paella mixta de pollo y mariscos',
        'Guiso de patatas con costillas',
        'Crema de puerro y patata',
        'Canelones de pollo',
        'Arroz a la cubana',
      ],
      ['Cazon adobado', 'Secreto a la mostaza y miel', 'Pollo al ajillo', 'Huevos con gula'],
      [
        'Macedonia de frutas',
        'Melón',
        'Natillas caseras',
        'Profiteroles con chocolate',
        'puding',
        'yogurt con mermelada',
        'tarta de manzana ... etc',
      ],
      '637 690 946 / 91 227 7899'
    ),
    Viernes: day(
      'Viernes',
      'Fabada asturiana',
      5.2,
      11.5,
      [
        'Fabada asturiana',
        'Arroz caldoso',
        'Guisantes con jamón',
        'Macarrones con salsa de gambas',
        'Ensalada de  garbanzos',
      ],
      ['Sepia con ali oli', 'Carrillada', 'Contramuslo encebollado al horno', 'Huevos con chistorra'],
      [
        'Macedonia de frutas',
        'Natillas caseras',
        'profiteroles con chocolate',
        'tarta de manzana',
        'yogurt con mermelada de melocotón',
        'tiramisú casero',
        'melón,  etc',
      ],
      '637 690 946 / 91 227 7899'
    ),
  },
  settings: { footerLines: footerLinesDefault },
};
