// Mapa ilustrativo do armazém (só front, para a demo), no esquema do rascunho:
// doca em cima, e descendo: Rua 1, Módulo 1, Rua 2, Módulo 2...
// Cada módulo é uma prateleira horizontal; a rua acima dele é o corredor de acesso.
// A curva é por módulo: quanto mais perto da doca, mais giro.
export const WAREHOUSE_CONFIG = {
  modulos: 4,
  posicoes: 10, // posições de cada prateleira (só para o robô ter onde parar)
  curvas: [`A`, `B`, `C`, `C`], // curva de cada módulo, de cima para baixo
  pedido: { modulo: 2, posicao: 7 }, // separação inicial da demo
  otif: 96, // OTIF da demo (% de pedidos no prazo e completos)
};

const SIZE = {
  rotulo: 118, // coluna da esquerda com a curva de cada módulo
  corredor: 26, // corredor vertical que liga a doca às ruas
  largura: 560, // comprimento das prateleiras
  doca: 34,
  rua: 30,
  modulo: 26,
  fim: 54, // espaço do nome da rua no fim do corredor
  pad: 10,
};

export const CURVA_INFO = {
  A: `Alto giro`,
  B: `Giro médio`,
  C: `Baixo giro`,
};

export function pad2(n) {
  return String(n).padStart(2, `0`);
}

export function enderecoDaPosicao(modulo, posicao) {
  return `M${pad2(modulo)}-P${pad2(posicao)}`;
}

export function buildWarehouse(config = WAREHOUSE_CONFIG) {
  const s = SIZE;
  const x0 = s.rotulo + s.corredor;
  const passo = s.largura / config.posicoes;
  const banda = s.rua + s.modulo;
  const width = x0 + s.largura + s.fim;
  const height = s.doca + config.modulos * banda + s.pad;

  const doca = { x: x0, y: 0, width: s.largura * 0.42, height: s.doca - 8 };
  doca.centroX = doca.x + doca.width / 2;
  doca.centroY = doca.y + doca.height / 2;

  const ruas = [];
  const modulos = [];
  const posicoes = [];
  for (let n = 1; n <= config.modulos; n++) {
    const yRua = s.doca + (n - 1) * banda;
    const yModulo = yRua + s.rua;
    const curva = config.curvas[n - 1] ?? `C`;

    ruas.push({ rua: n, x: x0, y: yRua, width: s.largura + s.fim, height: s.rua, centroY: yRua + s.rua / 2 });
    modulos.push({ modulo: n, curva, x: x0, y: yModulo, width: s.largura, height: s.modulo, rotuloX: s.rotulo - 8 });

    for (let p = 1; p <= config.posicoes; p++) {
      posicoes.push({
        modulo: n,
        posicao: p,
        curva,
        endereco: enderecoDaPosicao(n, p),
        x: x0 + (p - 1) * passo,
        y: yModulo,
        width: passo,
        height: s.modulo,
      });
    }
  }

  return {
    width,
    height,
    doca,
    corredorX: s.rotulo + s.corredor / 2,
    fimX: x0 + s.largura + s.fim - 6,
    ruas,
    modulos,
    posicoes,
  };
}

// Rota do robô: sai da doca, desce pelo corredor da esquerda, entra na rua do módulo
// e para em frente à posição
export function rotaAtePosicao(layout, alvo) {
  const rua = layout.ruas.find((r) => r.rua === alvo.modulo);
  const posicao = layout.posicoes.find((p) => p.modulo === alvo.modulo && p.posicao === alvo.posicao);
  if (!rua || !posicao) return null;

  const pontos = [
    [layout.doca.x + 12, layout.doca.centroY],
    [layout.corredorX, layout.doca.centroY],
    [layout.corredorX, rua.centroY],
    [posicao.x + posicao.width / 2, rua.centroY],
  ];
  let distancia = 0;
  for (let i = 1; i < pontos.length; i++) {
    distancia += Math.abs(pontos[i][0] - pontos[i - 1][0]) + Math.abs(pontos[i][1] - pontos[i - 1][1]);
  }
  return { pontos, distancia, destino: posicao };
}
