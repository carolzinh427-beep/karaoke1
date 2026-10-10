/**
 * BACKSTAGE KARAOKÊ - CATÁLOGO OFICIAL & SEED DO BANCO DE DADOS FIRESTORE
 * Contém o acervo completo oficial de salas, categorias, cardápio e configurações.
 */

import { doc, setDoc, getDocs, collection, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

export const DEFAULT_SALAS = [
  {
    id: 'sala-red',
    nome: 'Sala Red',
    slug: 'sala-red',
    capacidade: 30,
    precoTotal: 800,
    sinal: 800,
    restante: 0,
    descricao: 'Ambiente intimista e vibrante com iluminação vermelha cênica.',
    imagem: '/assets/brand/hero-bg.webp',
    ativo: true,
    ordem: 1,
  },
  {
    id: 'sala-green',
    nome: 'Sala Green',
    slug: 'sala-green',
    capacidade: 40,
    precoTotal: 900,
    sinal: 900,
    restante: 0,
    descricao: 'Recomendado entre 30 e 35 pessoas para maior conforto.',
    imagem: '/assets/drinks/aperol-spritz.webp',
    ativo: true,
    ordem: 2,
  },
  {
    id: 'sala-blue',
    nome: 'Sala Blue',
    slug: 'sala-blue',
    capacidade: 50,
    precoTotal: 1000,
    sinal: 1000,
    restante: 0,
    descricao: 'Nossa maior sala vip com capacidade estendida e sistema premium.',
    imagem: '/assets/brand/microfone-profissional.jpg',
    ativo: true,
    ordem: 3,
  }
];

export const DEFAULT_CATEGORIAS = [
  { id: 'petiscos', nome: 'Porções & Petiscos', ordem: 1, ativo: true },
  { id: 'coqueteis-alcool', nome: 'Coquetéis com Álcool', ordem: 2, ativo: true },
  { id: 'cervejas', nome: 'Cervejas & Chopp', ordem: 3, ativo: true },
  { id: 'drinks-especiais', nome: 'Drinks Especiais', ordem: 4, ativo: true },
  { id: 'caipiras', nome: 'Caipiras & Autorais', ordem: 5, ativo: true },
  { id: 'sem-alcool', nome: 'Sem Álcool', ordem: 6, ativo: true },
  { id: 'whisky', nome: 'Whisky & Combos', ordem: 7, ativo: true },
  { id: 'destilados', nome: 'Destilados & Licores', ordem: 8, ativo: true },
  { id: 'bebidas', nome: 'Bebidas Gerais', ordem: 9, ativo: true },
];

export const DEFAULT_CARDAPIO = [
  // 1. Porções & Petiscos
  { id: 'bolinho-bacalhau', nome: 'Bolinho de Bacalhau', preco: 36.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Clássico porção crocante e bem temperada', ativo: true, ordem: 1 },
  { id: 'batata-frita', nome: 'Batata Frita', preco: 24.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Porção generosa e sequinha', ativo: true, ordem: 2 },
  { id: 'batata-cheddar-bacon', nome: 'Batata com Cheddar e Bacon', preco: 49.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Batatas crocantes cobertas com cheddar cremoso e cubos de bacon', ativo: true, ordem: 3 },
  { id: 'mandioca-frita', nome: 'Mandioca Frita', preco: 19.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Mandioca macia por dentro e dourada por fora', ativo: true, ordem: 4 },
  { id: 'calabresa-acebolada', nome: 'Calabresa Acebolada', preco: 39.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Fatias de calabresa refogadas com cebolas douradas', ativo: true, ordem: 5 },
  { id: 'bolinho-queijo', nome: 'Bolinho de Queijo (20 unidades)', preco: 29.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Salgadinhos crocantes com recheio de queijo derretido', ativo: true, ordem: 6 },
  { id: 'pastel-carne-queijo', nome: 'Pastel de Carne ou Queijo (20 unidades)', preco: 29.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Mini pastéis fritos na hora', ativo: true, ordem: 7 },
  { id: 'coxinha-frango', nome: 'Coxinha de Frango (20 unidades)', preco: 29.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Massa saborosa com recheio desfiado cremoso', ativo: true, ordem: 8 },
  { id: 'kibe', nome: 'Kibe (20 unidades)', preco: 29.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Tradicional kibe frito temperado', ativo: true, ordem: 9 },
  { id: 'file-tilapia', nome: 'Filé de Tilápia', preco: 69.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Iscas empanadas crocantes (acompanhamentos inclusos)', ativo: true, ordem: 10 },
  { id: 'frango-passarinho', nome: 'Frango a Passarinho', preco: 44.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Crocante com alho frito e acompanhamentos', ativo: true, ordem: 11 },
  { id: 'costelinha-barbecue', nome: 'Costelinha Suína com Barbecue', preco: 44.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Costela macia caramelizada com molho barbecue', ativo: true, ordem: 12 },
  { id: 'carne-sol', nome: 'Carne de Sol (c/ mandioca ou batata)', preco: 69.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Carne de sol no ponto ideal com acompanhamento', ativo: true, ordem: 13 },
  { id: 'picanha-500g', nome: 'Picanha 500g (c/ mandioca ou batata)', preco: 89.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Corte nobre grelhado acompanhado de mandioca ou batata', ativo: true, ordem: 14 },
  { id: 'caldos-quentinhos', nome: 'Caldos Quentinhos', preco: 24.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: 'Sabores: Carne, Feijão, Verde e Frango', ativo: true, ordem: 15 },
  { id: 'combo-misto-bom', nome: 'Combo Misto Bom', preco: 29.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: '10 salgadinhos (misto) + Batata Frita + Molho Especial', ativo: true, ordem: 16 },
  { id: 'combo-escolha-perfeita', nome: 'Combo Escolha Perfeita', preco: 29.99, categoriaId: 'petiscos', categoria: 'Porções & Petiscos', descricao: '16 salgadinhos (misto) + 1 Molho (Rosé, Barbecue ou Tártaro)', ativo: true, ordem: 17 },

  // 2. Coquetéis com Álcool
  { id: 'aperol-spritz', nome: 'Aperol Spritz', preco: 29.99, categoriaId: 'coqueteis-alcool', categoria: 'Coquetéis com Álcool', descricao: 'Aperol, espumante brut e água com gás', ativo: true, ordem: 18 },
  { id: 'mojito', nome: 'Mojito', preco: 28.99, categoriaId: 'coqueteis-alcool', categoria: 'Coquetéis com Álcool', descricao: 'Rum, açúcar, suco de limão, água com gás e hortelã', ativo: true, ordem: 19 },
  { id: 'margarita', nome: 'Margarita', preco: 34.99, categoriaId: 'coqueteis-alcool', categoria: 'Coquetéis com Álcool', descricao: 'Tequila prata, Cointreau e suco de limão', ativo: true, ordem: 20 },
  { id: 'negroni', nome: 'Negroni', preco: 39.99, categoriaId: 'coqueteis-alcool', categoria: 'Coquetéis com Álcool', descricao: 'Vermute tinto, Campari e gin', ativo: true, ordem: 21 },
  { id: 'tequila-sunrise', nome: 'Tequila Sunrise', preco: 32.99, categoriaId: 'coqueteis-alcool', categoria: 'Coquetéis com Álcool', descricao: 'Tequila, suco de laranja e xarope de groselha', ativo: true, ordem: 22 },
  { id: 'cosmopolitan', nome: 'Cosmopolitan', preco: 32.99, categoriaId: 'coqueteis-alcool', categoria: 'Coquetéis com Álcool', descricao: 'Vodka, cranberry, licor de laranja e limão', ativo: true, ordem: 23 },
  { id: 'pina-colada', nome: 'Piña Colada Refrescante', preco: 32.99, categoriaId: 'coqueteis-alcool', categoria: 'Coquetéis com Álcool', descricao: 'Rum branco, leite de coco, leite condensado e abacaxi', ativo: true, ordem: 24 },
  { id: 'cozumel', nome: 'Cozumel', preco: 19.99, categoriaId: 'coqueteis-alcool', categoria: 'Coquetéis com Álcool', descricao: 'Cerveja clara, borda de sal e limão', ativo: true, ordem: 25 },
  { id: 'preparo-cozumel', nome: 'Preparo do Cozumel', preco: 8.00, categoriaId: 'coqueteis-alcool', categoria: 'Coquetéis com Álcool', descricao: 'Preparo avulso', ativo: true, ordem: 26 },
  { id: 'shot-limao', nome: 'Shot de Limão', preco: 2.00, categoriaId: 'coqueteis-alcool', categoria: 'Coquetéis com Álcool', descricao: 'Dose rápida', ativo: true, ordem: 27 },

  // 3. Cervejas & Chopp
  { id: 'heineken-long-neck', nome: 'Heineken Long Neck', preco: 14.99, categoriaId: 'cervejas', categoria: 'Cervejas & Chopp', descricao: 'Cerveja Premium 330ml gelada', ativo: true, ordem: 28 },
  { id: 'corona-long-neck', nome: 'Corona Long Neck', preco: 14.99, categoriaId: 'cervejas', categoria: 'Cervejas & Chopp', descricao: 'Cerveja clara suave com rodela de limão', ativo: true, ordem: 29 },
  { id: 'stella-pure-gold', nome: 'Stella Pure Gold Long Neck', preco: 14.99, categoriaId: 'cervejas', categoria: 'Cervejas & Chopp', descricao: 'Sem glúten com todo o sabor', ativo: true, ordem: 30 },
  { id: 'stella-artois', nome: 'Stella Artois Long Neck', preco: 11.99, categoriaId: 'cervejas', categoria: 'Cervejas & Chopp', descricao: 'Clássica lager belga', ativo: true, ordem: 31 },
  { id: 'spaten-long-neck', nome: 'Spaten Long Neck', preco: 11.99, categoriaId: 'cervejas', categoria: 'Cervejas & Chopp', descricao: 'Puro malte alemã tradicional', ativo: true, ordem: 32 },
  { id: 'budweiser-long-neck', nome: 'Budweiser Long Neck', preco: 10.99, categoriaId: 'cervejas', categoria: 'Cervejas & Chopp', descricao: 'King of Beers gelada', ativo: true, ordem: 33 },
  { id: 'chopp-stone-house', nome: 'Chopp Stone House', preco: 9.99, categoriaId: 'cervejas', categoria: 'Cervejas & Chopp', descricao: 'Gelado na caneca congelada', ativo: true, ordem: 34 },

  // 4. Drinks Especiais
  { id: 'moscow-mule', nome: 'Moscow Mule', preco: 32.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Vodka, limão, xarope de açúcar e espuma artesanal de gengibre', ativo: true, ordem: 35 },
  { id: 'tesourinha-bsb', nome: 'Tesourinha BSB', preco: 24.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Homenagem à capital: Vodka, gengibre, limão, guaraná e canela', ativo: true, ordem: 36 },
  { id: 'back-milk-alcool', nome: 'Back & Milk - Estrela da Casa (Com Álcool)', preco: 39.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Drink assinatura autoral do Backstage', ativo: true, ordem: 37 },
  { id: 'back-milk-sem-alcool', nome: 'Back & Milk - Estrela da Casa (Sem Álcool)', preco: 29.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Versão suave sem teor alcoólico', ativo: true, ordem: 38 },
  { id: 'bombeirinho', nome: 'Bombeirinho', preco: 9.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Cachaça, limão tahiti e groselha', ativo: true, ordem: 39 },
  { id: 'cuba-libre', nome: 'Cuba Libre', preco: 24.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Rum, Coca-Cola e limão', ativo: true, ordem: 40 },
  { id: 'mix-frutas-gin', nome: 'Mix de Frutas com Gin', preco: 24.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Frutas, xarope de frutas vermelhas, Sprite e gin', ativo: true, ordem: 41 },
  { id: 'sex-on-the-beach', nome: 'Sex on the Beach', preco: 34.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Vodka, laranja, licor de pêssego e groselha', ativo: true, ordem: 42 },
  { id: 'so-o-ouro', nome: 'Só o Ouro - Shot', preco: 14.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Cachaça de banana, limão e espuma de baunilha', ativo: true, ordem: 43 },
  { id: 'espumante-casa-valduga', nome: 'Espumante Casa Valduga', preco: 159.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Garrafa premium para brindar', ativo: true, ordem: 44 },
  { id: 'espumante-salton', nome: 'Espumante Salton', preco: 89.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Garrafa selecionada para comemorações', ativo: true, ordem: 45 },
  { id: 'espumante-aurora', nome: 'Espumante Aurora', preco: 79.99, categoriaId: 'drinks-especiais', categoria: 'Drinks Especiais', descricao: 'Garrafa gelada refrescante', ativo: true, ordem: 46 },

  // 5. Caipiras & Autorais
  { id: 'sakerinha', nome: 'Sakerinha', preco: 41.99, categoriaId: 'caipiras', categoria: 'Caipiras & Autorais', descricao: 'Saquê e frutas frescas da estação', ativo: true, ordem: 47 },
  { id: 'caipirinha-tradicional', nome: 'Caipirinha Tradicional', preco: 15.99, categoriaId: 'caipiras', categoria: 'Caipiras & Autorais', descricao: 'Cachaça 51, limão e açúcar', ativo: true, ordem: 48 },
  { id: 'caipirosca-1', nome: 'Caipirosca I', preco: 24.99, categoriaId: 'caipiras', categoria: 'Caipiras & Autorais', descricao: 'Vodka, morango e abacaxi', ativo: true, ordem: 49 },
  { id: 'caipirosca-2', nome: 'Caipirosca II', preco: 29.99, categoriaId: 'caipiras', categoria: 'Caipiras & Autorais', descricao: 'Vodka, caju e laranja', ativo: true, ordem: 50 },
  { id: 'camara', nome: 'Camará', preco: 19.99, categoriaId: 'caipiras', categoria: 'Caipiras & Autorais', descricao: 'Caipirinha especial de limão com rapadura', ativo: true, ordem: 51 },
  { id: 'catetinha', nome: 'Catetinha', preco: 19.99, categoriaId: 'caipiras', categoria: 'Caipiras & Autorais', descricao: 'Caipirinha de maracujá com canela', ativo: true, ordem: 52 },
  { id: 'caipice-lemon', nome: 'Caipicé Lemon', preco: 24.99, categoriaId: 'caipiras', categoria: 'Caipiras & Autorais', descricao: 'Vodka, limão siciliano e hortelã', ativo: true, ordem: 53 },

  // 6. Sem Álcool
  { id: 'coquetel-frutas-sem', nome: 'Coquetel de Frutas', preco: 31.99, categoriaId: 'sem-alcool', categoria: 'Sem Álcool', descricao: 'Frutas vermelhas, leite condensado e soda', ativo: true, ordem: 54 },
  { id: 'soda-italiana', nome: 'Soda Italiana', preco: 19.99, categoriaId: 'sem-alcool', categoria: 'Sem Álcool', descricao: 'Água com gás e xarope premium à escolha', ativo: true, ordem: 55 },
  { id: 'moda-da-casa', nome: 'Moda da Casa', preco: 24.99, categoriaId: 'sem-alcool', categoria: 'Sem Álcool', descricao: 'Frutas vermelhas, morango, gengibre e água tônica', ativo: true, ordem: 56 },
  { id: 'mix-frutas-sem', nome: 'Mix de Frutas', preco: 19.99, categoriaId: 'sem-alcool', categoria: 'Sem Álcool', descricao: 'Frutas, xarope de frutas vermelhas e Sprite', ativo: true, ordem: 57 },

  // 7. Whisky & Combos
  { id: 'chivas-dose', nome: 'Chivas Regal (Dose)', preco: 27.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Dose pura ou com gelo', ativo: true, ordem: 58 },
  { id: 'old-parr-dose', nome: 'Old Parr (Dose)', preco: 24.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Dose pura ou com gelo', ativo: true, ordem: 59 },
  { id: 'red-label-dose', nome: 'Red Label (Dose)', preco: 19.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Dose pura ou com gelo', ativo: true, ordem: 60 },
  { id: 'black-label-dose', nome: 'Black Label (Dose)', preco: 39.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Dose 12 anos', ativo: true, ordem: 61 },
  { id: 'jack-daniels-dose', nome: 'Jack Daniel\'s (Dose)', preco: 24.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Tennessee Whiskey', ativo: true, ordem: 62 },
  { id: 'buchanans-dose', nome: 'Buchanan\'s (Dose)', preco: 24.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Dose 12 anos', ativo: true, ordem: 63 },
  { id: 'combo-chivas', nome: 'Combo Chivas Regal', preco: 389.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Garrafa + 4 Red Bulls + 1 Água de Coco', ativo: true, ordem: 64 },
  { id: 'combo-old-parr', nome: 'Combo Old Parr', preco: 399.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Garrafa + 4 Red Bulls + 1 Água de Coco', ativo: true, ordem: 65 },
  { id: 'combo-red-label', nome: 'Combo Red Label', preco: 280.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Garrafa + 4 Red Bulls + 1 Água de Coco', ativo: true, ordem: 66 },
  { id: 'combo-black-label', nome: 'Combo Black Label', preco: 451.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Garrafa + 4 Red Bulls + 1 Água de Coco', ativo: true, ordem: 67 },
  { id: 'combo-jack-daniels', nome: 'Combo Jack Daniel\'s', preco: 389.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Garrafa + 4 Red Bulls + 1 Água de Coco', ativo: true, ordem: 68 },
  { id: 'combo-buchanans', nome: 'Combo Buchanan\'s', preco: 589.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Garrafa + 4 Red Bulls + 1 Água de Coco', ativo: true, ordem: 69 },
  { id: 'combo-smirnoff', nome: 'Combo Smirnoff', preco: 219.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Garrafa + 4 Red Bulls + 1 Água de Coco', ativo: true, ordem: 70 },
  { id: 'combo-absolut', nome: 'Combo Absolut', preco: 314.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Garrafa + 4 Red Bulls + 1 Água de Coco', ativo: true, ordem: 71 },
  { id: 'combo-tanqueray', nome: 'Combo Tanqueray', preco: 381.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: 'Garrafa + 4 Red Bulls + 1 Água de Coco', ativo: true, ordem: 72 },
  { id: 'balde-budweiser', nome: 'Balde Budweiser (6 unidades)', preco: 59.99, categoriaId: 'whisky', categoria: 'Whisky & Combos', descricao: '6 long necks super geladas no balde com gelo', ativo: true, ordem: 73 },

  // 8. Destilados & Licores
  { id: 'tanqueray-dose', nome: 'Tanqueray (Dose)', preco: 24.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'London Dry Gin', ativo: true, ordem: 74 },
  { id: 'absolut-dose', nome: 'Absolut (Dose)', preco: 22.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Vodka sueca pura', ativo: true, ordem: 75 },
  { id: 'jose-cuervo-dose', nome: 'José Cuervo (Dose)', preco: 27.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Tequila mexicana com sal e limão', ativo: true, ordem: 76 },
  { id: 'licor-43-dose', nome: 'Licor 43 (Dose)', preco: 24.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Licor espanhol aromático', ativo: true, ordem: 77 },
  { id: 'amarula-dose', nome: 'Amarula (Dose)', preco: 19.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Licor cremoso de marula', ativo: true, ordem: 78 },
  { id: 'smirnoff-dose', nome: 'Smirnoff (Dose)', preco: 14.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Vodka destilada', ativo: true, ordem: 79 },
  { id: 'campari-dose', nome: 'Campari (Dose)', preco: 13.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Bitter italiano com laranja', ativo: true, ordem: 80 },
  { id: 'cortezano-dose', nome: 'Cortezano (Dose)', preco: 14.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Conhaque nacional', ativo: true, ordem: 81 },
  { id: 'sagatiba-dose', nome: 'Sagatiba (Dose)', preco: 11.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Cachaça pura', ativo: true, ordem: 82 },
  { id: 'salinas-dose', nome: 'Salinas (Dose)', preco: 11.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Cachaça artesanal de alambique', ativo: true, ordem: 83 },
  { id: 'bananinha-dose', nome: 'Bananinha (Dose)', preco: 11.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Aroma adocicado de banana', ativo: true, ordem: 84 },
  { id: 'sao-francisco-dose', nome: 'São Francisco (Dose)', preco: 10.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Cachaça tradicional', ativo: true, ordem: 85 },
  { id: 'domecq-dose', nome: 'Domecq (Dose)', preco: 11.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Conhaque clássico', ativo: true, ordem: 86 },
  { id: 'montilla-dose', nome: 'Montilla (Dose)', preco: 11.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Rum carta branca', ativo: true, ordem: 87 },
  { id: 'cachaca-canastra-dose', nome: 'Cachaça Canastra (Dose)', preco: 9.99, categoriaId: 'destilados', categoria: 'Destilados & Licores', descricao: 'Cachaça mineira nobre', ativo: true, ordem: 88 },

  // 9. Bebidas Gerais
  { id: 'agua-sem-gas', nome: 'Água sem gás', preco: 5.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: 'Garrafa 500ml', ativo: true, ordem: 89 },
  { id: 'agua-com-gas', nome: 'Água com gás', preco: 6.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: 'Garrafa 500ml com limão', ativo: true, ordem: 90 },
  { id: 'coca-cola', nome: 'Coca-Cola', preco: 7.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: 'Lata 350ml', ativo: true, ordem: 91 },
  { id: 'coca-cola-zero', nome: 'Coca-Cola Zero', preco: 7.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: 'Lata 350ml zero açúcar', ativo: true, ordem: 92 },
  { id: 'guarana', nome: 'Guaraná Antarctica', preco: 7.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: 'Lata 350ml', ativo: true, ordem: 93 },
  { id: 'pepsi-zero', nome: 'Pepsi Black Zero', preco: 6.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: 'Lata 350ml', ativo: true, ordem: 94 },
  { id: 'schweppes', nome: 'Schweppes Citrus', preco: 7.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: 'Lata 350ml', ativo: true, ordem: 95 },
  { id: 'agua-tonica', nome: 'Água Tônica Antarctica', preco: 7.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: 'Lata 350ml', ativo: true, ordem: 96 },
  { id: 'agua-coco-pequena', nome: 'Água de Coco (Pequena)', preco: 9.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: '200ml gelada', ativo: true, ordem: 97 },
  { id: 'agua-coco-grande', nome: 'Água de Coco (Grande)', preco: 19.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: '1 Litro gelada', ativo: true, ordem: 98 },
  { id: 'red-bull', nome: 'Red Bull Energy Drink', preco: 17.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: 'Lata 250ml', ativo: true, ordem: 99 },
  { id: 'beats', nome: 'Beats (Sabores)', preco: 13.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: 'Long neck ou lata sabores sortidos', ativo: true, ordem: 100 },
  { id: 'ice-smirnoff', nome: 'Ice Smirnoff', preco: 12.99, categoriaId: 'bebidas', categoria: 'Bebidas Gerais', descricao: 'Long neck gelada', ativo: true, ordem: 101 },
];

export const DEFAULT_CONFIGURACOES = {
  whatsapp: '556181426321',
  instagram: '@backstagekaraoke',
  mapsUrl: 'https://maps.app.goo.gl/AwFhL4Z4Au6cqu4v6',
  contatoEmail: 'contato@barbackstagekaraoke.com.br',
  endereco: 'CLN 307, Bloco A, Subsolo - Asa Norte, Brasília - DF',
  pdfUrl: '/cardapio-oficial.pdf',
  horarios: {
    terca: '19:00 → 02:30 (madrugada de quarta)',
    quarta: '19:00 → 03:30 (madrugada de quinta)',
    quinta: '19:00 → 03:30 (madrugada de sexta)',
    sexta: '18:30 → 04:00 (madrugada de sábado)',
    sabado: '18:30 → 04:00 (madrugada de domingo)',
    domingo: 'Fechado ao público (Disponível sob consulta no WhatsApp)',
    segunda: 'Fechado ao público (Disponível sob consulta no WhatsApp)'
  },
  criadoEm: new Date().toISOString()
};

/**
 * Verifica e povoa automaticamente as coleções do Firestore com todos os dados oficiais,
 * garantindo que o painel administrativo e o site público nunca fiquem vazios.
 */
export async function seedDatabaseIfNeeded(db) {
  if (!db) return;

  try {
    // 1. Salas
    try {
      const snapSalas = await getDocs(collection(db, 'salas'));
      if (snapSalas.empty) {
        console.log('Populando Firestore com as salas padrão...');
        const batch = writeBatch(db);
        DEFAULT_SALAS.forEach(s => {
          batch.set(doc(db, 'salas', s.id), s);
        });
        await batch.commit();
      }
    } catch(err) {
      console.warn('Erro ao verificar/popular salas:', err);
    }

    // 2. Categorias do Cardápio
    try {
      const snapCats = await getDocs(collection(db, 'categorias_cardapio'));
      if (snapCats.empty) {
        console.log('Populando categorias do cardápio...');
        const batch = writeBatch(db);
        DEFAULT_CATEGORIAS.forEach(c => {
          batch.set(doc(db, 'categorias_cardapio', c.id), c);
        });
        await batch.commit();
      }
    } catch(err) {
      console.warn('Erro ao verificar/popular categorias:', err);
    }

    // 3. Cardápio Completo (77 itens em lote único)
    try {
      const snapCardapio = await getDocs(collection(db, 'cardapio'));
      if (snapCardapio.empty || snapCardapio.docs.length < 5) {
        console.log('Populando catálogo de 77 itens do cardápio via batch...');
        const batch = writeBatch(db);
        DEFAULT_CARDAPIO.forEach(item => {
          batch.set(doc(db, 'cardapio', item.id), item);
        });
        await batch.commit();
      }
    } catch(err) {
      console.warn('Erro ao verificar/popular itens do cardápio:', err);
    }

    // 4. Configurações Gerais
    try {
      const docConf = await getDoc(doc(db, 'configuracoes', 'geral'));
      if (!docConf.exists()) {
        console.log('Populando configurações gerais...');
        await setDoc(doc(db, 'configuracoes', 'geral'), DEFAULT_CONFIGURACOES);
      }
    } catch(err) {
      console.warn('Erro ao verificar/popular configurações:', err);
    }

    // 5. Promoções e Destaques da Home
    try {
      const docPromos = await getDoc(doc(db, 'configuracoes', 'promocoes'));
      if (!docPromos.exists()) {
        console.log('Populando promoções e destaques padrão...');
        await setDoc(doc(db, 'configuracoes', 'promocoes'), {
          cards: DEFAULT_PROMOCOES,
          criadoEm: new Date().toISOString()
        });
      }
    } catch(err) {
      console.warn('Erro ao verificar/popular promoções:', err);
    }

    return true;
  } catch(e) {
    console.warn('Aviso no processo de seed do Firestore:', e);
    return false;
  }
}

export const DEFAULT_PROMOCOES = [
  {
    id: 'promo-1',
    posicao: 'esquerda',
    label: 'Lateral Esquerda',
    imagemUrl: '/assets/promos/promo-drinks.png',
    imagemPublicId: null,
    tag: '',
    titulo: '',
    descricao: ''
  },
  {
    id: 'promo-2',
    posicao: 'centro',
    label: 'Centro (Destaque Principal / Sábado)',
    imagemUrl: '/assets/promos/promo-sabado.jpg',
    imagemPublicId: null,
    tag: 'Noite Especial',
    titulo: 'Sábado no Backstage',
    descricao: 'Combos especiais com petiscos, Gin Tropical e palco aberto até 3h30 da manhã para comemorar sem hora para acabar!'
  },
  {
    id: 'promo-3',
    posicao: 'direita',
    label: 'Lateral Direita',
    imagemUrl: '/assets/promos/promo-heineken.png',
    imagemPublicId: null,
    tag: 'Tempo Ilimitado',
    titulo: 'Balde por Nossa Conta',
    descricao: 'Chegando junto com mais 5 amigos vocês ganham um balde de long neck por nossa conta. Voucher retirado na recepção de terça a quinta.'
  }
];

