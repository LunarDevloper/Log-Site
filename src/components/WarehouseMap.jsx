import { useMemo, useState } from 'react';
import dogRobot from '../assets/dog-robot.png';
import { CURVA_INFO, WAREHOUSE_CONFIG, buildWarehouse, pad2, rotaAteModulo } from '../lib/warehouse';

const ROBO = 30;
const VELOCIDADE = 90; // unidades do desenho por segundo

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

  const rota = useMemo(() => rotaAteModulo(layout, alvo), [layout, alvo]);
  const ida = rota ? rota.pontos.map(([x, y]) => `${x},${y}`).join(` `) : ``;
  // Vai até o módulo e volta para a doca
  const caminho = rota
    ? `M ${rota.pontos.map(([x, y]) => `${x} ${y}`).join(` L `)} L ${[...rota.pontos].reverse().slice(1).map(([x, y]) => `${x} ${y}`).join(` L `)}`
    : ``;
  const duracao = rota ? Math.max(4, (rota.distancia * 2) / VELOCIDADE) : 0;
  const destino = rota?.destino;
  const foco = hover ?? destino;

  return (
    <div className="wh">
      <div className="wh-scroll">
        <svg className="wh-svg" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Mapa ilustrativo do armazém com ruas, módulos e curva ABC">
          {layout.curvas.map((c) => (
            <g key={c.curva} className={`wh-curva wh-curva--${c.curva}`}>
              <line x1={c.x} x2={c.x + c.width} y1={layout.topo - 8} y2={layout.topo - 8} />
              <text x={c.x + c.width / 2} y={layout.topo - 13} textAnchor="middle">Curva {c.curva}</text>
            </g>
          ))}

          <g className={`wh-doca${destino ? ` wh-doca--ativa` : ``}`}>
            <rect x={layout.doca.x} y={layout.doca.y} width={layout.doca.width} height={layout.doca.height} rx="4" />
            <text x={layout.doca.centroX} y={layout.doca.y + 14} textAnchor="middle">DOCA</text>
            <text x={layout.doca.centroX} y={layout.doca.y + layout.doca.height - 8} textAnchor="middle">EXPEDIÇÃO</text>
          </g>

          {layout.ruas.map((r) => (
            <g key={r.rua} className="wh-rua">
              <rect x={r.x} y={r.y} width={r.width} height={r.height} />
              <text x={r.x + r.width - 6} y={r.centroY + 3} textAnchor="end">RUA {pad2(r.rua)}</text>
            </g>
          ))}

          {layout.modulos.map((m) => {
            const selecionado = destino && m.rua === destino.rua && m.modulo === destino.modulo;
            return (
              <g
                key={m.endereco}
                className={`wh-modulo wh-modulo--${m.curva}${selecionado ? ` wh-modulo--alvo` : ``}`}
                onClick={() => setAlvo({ rua: m.rua, modulo: m.modulo })}
                onMouseEnter={() => setHover(m)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`Rua ${pad2(m.rua)} · Módulo ${pad2(m.modulo)} · Curva ${m.curva}`}</title>
                <rect x={m.x} y={m.y} width={m.width} height={m.height} rx="3" />
                <text x={m.x + m.width / 2} y={m.y + m.height / 2 + 3} textAnchor="middle">M{pad2(m.modulo)}</text>
              </g>
            );
          })}

          {rota && <polyline className="wh-rota" points={ida} />}

          {destino && (
            <circle className="wh-produto" cx={destino.x + destino.width / 2} cy={destino.y + destino.height - 2} r="5" />
          )}

          {rota && (
            <g key={`${alvo.rua}-${alvo.modulo}`} className="wh-robo">
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
            {` · Rua ${pad2(foco.rua)} · Módulo ${pad2(foco.modulo)} · `}
            <span className={`wh-tag wh-tag--${foco.curva}`}>Curva {foco.curva}</span>
            {` ${CURVA_INFO[foco.curva].toLowerCase()}`}
          </span>
        ) : <span>Clique em um módulo para simular uma separação.</span>}
        <small>Clique em um módulo para mandar o robô até ele · demonstração</small>
      </div>

      <div className="wh-legenda">
        {[`A`, `B`, `C`].map((c) => (
          <span key={c}><i className={`wh-swatch wh-swatch--${c}`} />Curva {c} · {CURVA_INFO[c]}</span>
        ))}
        <span><i className="wh-swatch wh-swatch--produto" />Produto</span>
        <span><i className="wh-swatch wh-swatch--doca" />Doca / destino</span>
      </div>
    </div>
  );
}
