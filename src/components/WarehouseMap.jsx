import { useMemo, useState } from 'react';
import dogRobot from '../assets/dog-robot.png';
import { CURVA_INFO, WAREHOUSE_CONFIG, buildWarehouse, pad2, rotaAtePosicao } from '../lib/warehouse';

const ROBO = 28;
const VELOCIDADE = 110; // unidades do desenho por segundo

function prefersReducedMotion() {
  try {
    return window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;
  } catch {
    return false;
  }
}

export default function WarehouseMap({ config = WAREHOUSE_CONFIG }) {
  const layout = useMemo(() => buildWarehouse(config), [config]);
  const [alvo, setAlvo] = useState(config.pedido);
  const [hover, setHover] = useState(null);
  const reduzido = useMemo(prefersReducedMotion, []);

  const rota = useMemo(() => rotaAtePosicao(layout, alvo), [layout, alvo]);
  const ida = rota ? rota.pontos.map(([x, y]) => `${x},${y}`).join(` `) : ``;
  // Vai até a posição e volta para a doca
  const caminho = rota
    ? `M ${rota.pontos.map(([x, y]) => `${x} ${y}`).join(` L `)} L ${[...rota.pontos].reverse().slice(1).map(([x, y]) => `${x} ${y}`).join(` L `)}`
    : ``;
  const duracao = rota ? Math.max(4, (rota.distancia * 2) / VELOCIDADE) : 0;
  const destino = rota?.destino;
  const foco = hover ?? destino;
  const { doca } = layout;

  return (
    <div className="wh">
      <div className="wh-scroll">
        <svg className="wh-svg" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Mapa ilustrativo do armazém: doca, ruas e módulos com curva ABC">
          <g className="wh-doca">
            <rect x={doca.x} y={doca.y} width={doca.width} height={doca.height} rx="4" />
            <text x={doca.centroX} y={doca.centroY + 3.5} textAnchor="middle">DOCA</text>
          </g>

          {layout.ruas.map((r) => (
            <g key={r.rua} className="wh-rua">
              <rect x={r.x} y={r.y} width={r.width} height={r.height} />
              <text x={layout.fimX} y={r.centroY + 3} textAnchor="end">RUA {r.rua}</text>
            </g>
          ))}

          {layout.modulos.map((m) => (
            <g key={m.modulo} className={`wh-curva wh-curva--${m.curva}`}>
              <text x={m.rotuloX} y={m.y + m.height / 2 - 1} textAnchor="end" className="wh-modulo__nome">MÓDULO {m.modulo}</text>
              <text x={m.rotuloX} y={m.y + m.height / 2 + 10} textAnchor="end" className="wh-curva__nome">Curva {m.curva} · {CURVA_INFO[m.curva].toLowerCase()}</text>
            </g>
          ))}

          {layout.posicoes.map((p) => {
            const selecionada = destino && p.modulo === destino.modulo && p.posicao === destino.posicao;
            return (
              <g
                key={p.endereco}
                className={`wh-pos wh-pos--${p.curva}${selecionada ? ` wh-pos--alvo` : ``}`}
                onClick={() => setAlvo({ modulo: p.modulo, posicao: p.posicao })}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`Rua ${p.modulo} · Módulo ${p.modulo} · Posição ${pad2(p.posicao)} · Curva ${p.curva}`}</title>
                <rect x={p.x} y={p.y} width={p.width} height={p.height} />
              </g>
            );
          })}

          {rota && <polyline className="wh-rota" points={ida} />}

          {destino && (
            <circle className="wh-produto" cx={destino.x + destino.width / 2} cy={destino.y + 4} r="4.5" />
          )}

          {rota && (
            <g key={`${alvo.modulo}-${alvo.posicao}`} className="wh-robo">
              {reduzido ? (
                <image href={dogRobot} x={rota.pontos[3][0] - ROBO / 2} y={rota.pontos[3][1] - ROBO / 2} width={ROBO} height={ROBO} />
              ) : (
                <image href={dogRobot} x={-ROBO / 2} y={-ROBO / 2} width={ROBO} height={ROBO}>
                  <animateMotion dur={`${duracao}s`} repeatCount="indefinite" path={caminho} />
                </image>
              )}
            </g>
          )}
        </svg>
      </div>

      <div className="wh-info">
        {foco ? (
          <span>
            {hover ? `` : `Separando: `}
            <strong className="mono">{foco.endereco}</strong>
            {` · Rua ${foco.modulo} · Módulo ${foco.modulo} · Posição ${pad2(foco.posicao)} · `}
            <span className={`wh-tag wh-tag--${foco.curva}`}>Curva {foco.curva}</span>
            {` ${CURVA_INFO[foco.curva].toLowerCase()}`}
          </span>
        ) : <span>Clique em uma prateleira para simular uma separação.</span>}
        <span className="wh-otif" title="On Time In Full: pedidos entregues no prazo e completos">
          OTIF <strong>{config.otif}%</strong> <small>no prazo e completo · demo</small>
        </span>
      </div>

      <div className="wh-legenda">
        {[`A`, `B`, `C`].map((c) => (
          <span key={c}><i className={`wh-swatch wh-swatch--${c}`} />Curva {c} · {CURVA_INFO[c]}</span>
        ))}
        <span><i className="wh-swatch wh-swatch--produto" />Produto</span>
        <span><i className="wh-swatch wh-swatch--doca" />Doca</span>
        <span className="wh-dica">Clique numa prateleira para mandar o robô</span>
      </div>
    </div>
  );
}
