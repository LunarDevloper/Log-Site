// Mesmas regras do servidor (Source/Database/Rules.ts): sem máscara, maiúsculo, 14 caracteres
export function cleanCnpj(value) {
  return (value ?? ``).replace(/[^0-9a-zA-Z]/g, ``).toUpperCase().slice(0, 14);
}

export function maskCnpj(value) {
  const c = cleanCnpj(value);
  if (c.length <= 2) return c;
  if (c.length <= 5) return `${c.slice(0, 2)}.${c.slice(2)}`;
  if (c.length <= 8) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5)}`;
  if (c.length <= 12) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8)}`;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

function checkDigit(base) {
  let sum = 0;
  let weight = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    sum += (base.charCodeAt(i) - 48) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(value) {
  const c = cleanCnpj(value);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c)) return false;
  if (/^(\d)\1+$/.test(c)) return false;
  const first = checkDigit(c.slice(0, 12));
  const second = checkDigit(c.slice(0, 12) + first);
  return c.endsWith(`${first}${second}`);
}

function joinAddress(parts) {
  return parts.map((p) => (p ?? ``).toString().trim()).filter(Boolean).join(`, `);
}

function fromBrasilApi(d) {
  return {
    razaoSocial: d.razao_social ?? ``,
    nomeFantasia: d.nome_fantasia ?? ``,
    situacao: d.descricao_situacao_cadastral ?? ``,
    abertura: d.data_inicio_atividade ?? ``,
    atividade: d.cnae_fiscal_descricao ?? ``,
    endereco: joinAddress([
      [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(` `),
      d.numero,
      d.complemento,
      d.bairro,
    ]),
    cidade: joinAddress([d.municipio, d.uf]),
    cep: d.cep ?? ``,
    telefone: d.ddd_telefone_1 ?? ``,
    email: d.email ?? ``,
  };
}

function fromCnpjWs(d) {
  const e = d.estabelecimento ?? {};
  return {
    razaoSocial: d.razao_social ?? ``,
    nomeFantasia: e.nome_fantasia ?? ``,
    situacao: e.situacao_cadastral ?? ``,
    abertura: e.data_inicio_atividade ?? ``,
    atividade: e.atividade_principal?.descricao ?? ``,
    endereco: joinAddress([
      [e.tipo_logradouro, e.logradouro].filter(Boolean).join(` `),
      e.numero,
      e.complemento,
      e.bairro,
    ]),
    cidade: joinAddress([e.cidade?.nome, e.estado?.sigla]),
    cep: e.cep ?? ``,
    telefone: e.ddd1 && e.telefone1 ? `${e.ddd1}${e.telefone1}` : ``,
    email: e.email ?? ``,
  };
}

// Consulta pública: BrasilAPI e, se falhar, CNPJ.ws. Retorna null se não achar.
export async function lookupCnpj(value, signal) {
  const c = cleanCnpj(value);
  const sources = [
    { url: `https://brasilapi.com.br/api/cnpj/v1/${c}`, map: fromBrasilApi },
    { url: `https://publica.cnpj.ws/cnpj/${c}`, map: fromCnpjWs },
  ];
  let notFound = false;
  for (const source of sources) {
    try {
      const response = await fetch(source.url, { signal });
      if (response.status === 404 || response.status === 400) {
        notFound = true;
        continue;
      }
      if (!response.ok) continue;
      return source.map(await response.json());
    } catch (err) {
      if (err?.name === `AbortError`) throw err;
    }
  }
  if (notFound) return null;
  throw new Error(`lookup failed`);
}

export function formatPhone(value) {
  const d = (value ?? ``).replace(/\D/g, ``);
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return value ?? ``;
}

export function formatCep(value) {
  const d = (value ?? ``).replace(/\D/g, ``);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : value ?? ``;
}
