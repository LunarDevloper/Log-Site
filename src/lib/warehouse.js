// Mapa ilustrativo do armazém (só front, para a demo).
// Tudo sai da configuração: muda o número de ruas/módulos e o desenho acompanha.
// Ruas sempre na horizontal; a doca fica à esquerda e a curva A fica mais perto dela.
export const WAREHOUSE_CONFIG = {
  ruas: 4,
  modulos: 12,
  curvas: { A: 3, B: 4 }, // primeiros 3 módulos = A, próximos 4 = B, resto = C
  pedido: { rua: 3, modulo: 8 }, // separação inicial da demo
};

const SIZE = {
  doca: 64,
  corredor: 30, // corredor vertical entre a doca e as ruas
  modulo: 46,
  gap: 4,
  rack: 30, // altura da prateleira
  rua: 24, // altura do corredor de cada rua
  topo: 26, // faixa das curvas A/B/C
  pad: 12,
};

export const CURVA_INFO = {
  A: `Alto giro`,
  B: `Giro médio`,
  C: `Baixo giro`,
};

export function pad2(n) {
  return String(n).padStart(2, `0`);
}

export function curvaDoModulo(modulo, config = WAREHOUSE_CONFIG) {
  if (modulo <= config.curvas.A) return `A`;
  if (modulo <= config.curvas.A + config.curvas.B) return `B`;
  return `C`;
}

export function enderecoDoModulo(rua, modulo) {
  return `R${pad2(rua)}-M${pad2(modulo)}`;
}

export function buildWarehouse(config = WAREHOUSE_CONFIG) {
  const s = SIZE;
  const x0 = s.doca + s.corredor;
  const banda = s.rack + s.rua;
  const width = x0 + config.modulos * (s.modulo + s.gap) + s.pad;
  const height = s.topo + config.ruas * banda + s.pad;
  const corredorX = s.doca + s.corredor / 2;
  const docaY = s.topo + (config.ruas * banda) / 2;

  const modulos = [];
  const ruas = [];
  for (let r = 1; r <= config.ruas; r++) {
    const y = s.topo + (r - 1) * banda;
    ruas.push({ rua: r, y: y + s.rack, centroY: y + s.rack + s.rua / 2, x: x0 - 2, width: width - x0 - s.pad + 4, height: s.rua });
    for (let m = 1; m <= config.modulos; m++) {
      modulos.push({
        rua: r,
        modulo: m,
        curva: curvaDoModulo(m, config),
        endereco: enderecoDoModulo(r, m),
        x: x0 + (m - 1) * (s.modulo + s.gap),
        y,
        width: s.modulo,
        height: s.rack,
      });
    }
  }

  // Faixas das curvas no topo, cobrindo as colunas de cada uma
  const curvas = [];
  let inicio = 1;
  for (const curva of [`A`, `B`, `C`]) {
    const qtd = curva === `C` ? config.modulos - config.curvas.A - config.curvas.B : config.curvas[curva];
    if (qtd <= 0) continue;
    const x = x0 + (inicio - 1) * (s.modulo + s.gap);
    curvas.push({ curva, x, width: qtd * (s.modulo + s.gap) - s.gap });
    inicio += qtd;
  }

  return {
    width,
    height,
    doca: { x: 0, y: s.topo, width: s.doca - 6, height: config.ruas * banda, centroX: (s.doca - 6) / 2, centroY: docaY },
    corredorX,
    ruas,
    modulos,
    curvas,
    topo: s.topo,
  };
}

// Rota do robô: sai da doca, pega o corredor principal, entra na rua e para embaixo do módulo
export function rotaAteModulo(layout, alvo) {
  const rua = layout.ruas.find((r) => r.rua === alvo.rua);
  const modulo = layout.modulos.find((m) => m.rua === alvo.rua && m.modulo === alvo.modulo);
  if (!rua || !modulo) return null;

  const pontos = [
    [layout.doca.centroX, layout.doca.centroY],
    [layout.corredorX, layout.doca.centroY],
    [layout.corredorX, rua.centroY],
    [modulo.x + modulo.width / 2, rua.centroY],
  ];
  let distancia = 0;
  for (let i = 1; i < pontos.length; i++) {
    distancia += Math.abs(pontos[i][0] - pontos[i - 1][0]) + Math.abs(pontos[i][1] - pontos[i - 1][1]);
  }
  return { pontos, distancia, destino: modulo };
}
