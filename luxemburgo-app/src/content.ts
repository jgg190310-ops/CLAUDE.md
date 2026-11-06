// Conteúdo do Apto Luxemburgo, tirado do book de apresentação.
import type { ImageSource } from 'expo-image';

export const IMG = {
  sala: require('../assets/img/pronto-sala.jpg') as ImageSource,
  suite: require('../assets/img/pronto-suite.jpg') as ImageSource,
  cozinha: require('../assets/img/pronto-cozinha.jpg') as ImageSource,
  quarto: require('../assets/img/pronto-quarto.jpg') as ImageSource,
  banheiro: require('../assets/img/pronto-banheiro.jpg') as ImageSource,
  planta: require('../assets/img/planta.jpg') as ImageSource,
  ipe: require('../assets/img/ipe.jpg') as ImageSource,
  bairro: require('../assets/img/bairro.jpg') as ImageSource,
  parque: require('../assets/img/parque.jpg') as ImageSource,
};

export type Room = { key: keyof typeof IMG; name: string; line: string };

/** Os ambientes que a abertura percorre, na ordem. */
export const HERO: Room[] = [
  { key: 'sala', name: 'Sala', line: 'Sala e cozinha integradas, sobre o assoalho de ipê, com luz natural o dia todo.' },
  { key: 'suite', name: 'Suíte', line: 'A suíte recebe o sol da manhã e tem vista para o verde.' },
  { key: 'cozinha', name: 'Cozinha', line: 'Marcenaria clara, bancada de pedra e mesa para as refeições.' },
  { key: 'quarto', name: 'Quarto', line: 'Duas camas e uma escrivaninha junto à janela.' },
];

/** Galeria de ambientes. */
export const ROOMS: Room[] = [
  { key: 'sala', name: 'Sala e cozinha integradas', line: 'Assoalho de ipê, luz natural e espaço para jantar e estar.' },
  { key: 'suite', name: 'A suíte', line: 'Luz natural pela manhã e vista para o verde.' },
  { key: 'cozinha', name: 'A cozinha', line: 'Marcenaria clara, bancada de pedra e mesa para as refeições.' },
  { key: 'quarto', name: 'Quarto de solteiro', line: 'Duas camas e uma escrivaninha junto à janela.' },
  { key: 'banheiro', name: 'O banheiro', line: 'Espelho iluminado, bancada de pedra e box de vidro.' },
];

export const NUMBERS = [
  { n: '120', unit: 'm²', label: 'Área privativa' },
  { n: '3', label: 'Quartos', sub: 'um deles é suíte' },
  { n: '3', label: 'Banheiros' },
  { n: '2', label: 'Vagas cobertas' },
  { n: '1º', label: 'Andar', sub: 'posição solar leste, sol da manhã' },
];

export const DISTANCES = [
  { color: '#a9c3a0', when: '600 m', what: 'Parque Mosteiro Tom Jobim' },
  { color: '#e6a78f', when: 'Menos de 1 km', what: 'Escolas, mercado, farmácia, hospital e feira' },
  { color: '#9fb7d6', when: 'Menos de 5 min de carro', what: 'Contorno, Raja Gabaglia e Prudente de Morais' },
  { color: '#ecd28f', when: 'Menos de 15 min de carro', what: 'Savassi e Centro' },
];

export const HISTORY = [
  { when: 'Antes do bairro', title: 'Terra de chácaras', text: 'Parte da Colônia Afonso Pena, criada para abastecer a jovem capital, junto ao córrego Guaicuí.' },
  { when: '1929', title: 'O nome veio de longe', text: 'O engenheiro Albert Scharlé, nascido em Steinfort, no Luxemburgo, chega a Minas para trabalhar na Belgo-Mineira.' },
  { when: 'Anos 1960', title: 'As chácaras viram lotes', text: 'Uma planta de 1963, no Arquivo Público da cidade, registra a subdivisão da antiga colônia.' },
  { when: 'Anos 1970', title: 'A cidade chega perto', text: 'A Avenida Prudente de Morais impulsiona a região. Em 1974, uma rua ganha o nome do engenheiro.' },
  { when: 'Hoje', title: 'O fio chega à porta', text: 'Das chácaras ficou a calma da rua residencial. O resto da cidade está a poucos minutos.' },
];

export const SPECS: [string, string][] = [
  ['Área privativa', '120 m²'],
  ['Quartos', '3, sendo 1 suíte'],
  ['Banheiros', '3'],
  ['Vagas', '2 cobertas'],
  ['Andar', '1º'],
  ['Sol', 'Leste, sol da manhã'],
  ['Piso', 'Ipê na sala, tacos nos quartos'],
  ['Bairro', 'Luxemburgo, Belo Horizonte'],
];

/** Quem apresenta o imóvel. Deixe `null` para mostrar só o imóvel. */
export const BRAND: null | { name: string; corretor: string; creci: string; site: string; instagram: string; whatsapp: string } = {
  name: 'Áxia Imóveis',
  corretor: 'Otacílio Antônio dos Santos',
  creci: 'CRECI-MG 60535',
  site: 'www.axiaimoveis.com.br',
  instagram: '@axia_imoveis',
  whatsapp: '', // ex.: '5531900000000' para mostrar o botão "Agendar visita"
};
