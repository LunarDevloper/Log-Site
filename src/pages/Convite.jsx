import { useCallback, useEffect, useState } from 'react';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import { API_BASE, friendlyError, networkError } from '../lib/api';
import { formatInviteCode } from '../lib/invite';

function formatDate(value) {
  if (!value) return `--`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? `--` : date.toLocaleDateString(`pt-BR`);
}

export default function Convite({ code, onAccepted, onCancel }) {
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState(`loading`);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    setStatus(`loading`);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/invites/${code}`, { credentials: `include` });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404) {
        setStatus(`notfound`);
        return;
      }
      if (!response.ok) {
        setError(friendlyError(response.status, data?.error, `Não foi possível abrir o convite.`));
        setStatus(`error`);
        return;
      }
      setInvite(data.invite ?? null);
      setStatus(`ready`);
    } catch {
      setError(networkError(`abrir o convite`));
      setStatus(`error`);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  async function openGroup(groupId) {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}`, { credentials: `include` });
      const data = await response.json().catch(() => ({}));
      onAccepted(response.ok && data?.id ? data : { id: groupId, name: invite?.groupName });
    } catch {
      onAccepted({ id: groupId, name: invite?.groupName });
    }
  }

  async function handleAccept() {
    setJoining(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/invites/${code}/accept`, {
        method: `POST`,
        credentials: `include`,
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.groupId) {
        await openGroup(data.groupId);
        return;
      }
      if (response.status === 409 && invite?.groupId) {
        await openGroup(invite.groupId);
        return;
      }
      if (response.status === 404) {
        setStatus(`notfound`);
        return;
      }
      setError(friendlyError(response.status, data?.error, `Não foi possível entrar na empresa.`));
    } catch {
      setError(networkError(`entrar na empresa`));
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="page-stack invite-page">
      <PageHeader page="Convite" subtitle={`Código ${formatInviteCode(code)}`} />
      <Card>
        {status === `loading` && (
          <div className="invite-box">
            <span className="skeleton" style={{ height: 22, width: `55%` }} />
            <span className="skeleton" style={{ height: 14, width: `35%` }} />
          </div>
        )}

        {status === `notfound` && (
          <div className="invite-box">
            <strong className="invite-title">Convite inválido</strong>
            <p>Esse convite expirou, foi cancelado ou já atingiu o limite de usos. Peça um novo para quem te convidou.</p>
            <div className="invite-actions">
              <button className="secondary-button" type="button" onClick={onCancel}>Voltar</button>
            </div>
          </div>
        )}

        {status === `error` && (
          <div className="invite-box">
            <p className="form-error">{error}</p>
            <div className="invite-actions">
              <button className="secondary-button" type="button" onClick={onCancel}>Voltar</button>
              <button className="primary-button" type="button" onClick={load}>Tentar de novo</button>
            </div>
          </div>
        )}

        {status === `ready` && invite && (
          <div className="invite-box">
            <small className="invite-kicker">Você foi convidado para</small>
            <strong className="invite-title">{invite.groupName}</strong>
            <dl className="invite-facts">
              <div><dt>Cargo</dt><dd>{invite.roleName}</dd></div>
              <div><dt>Válido até</dt><dd>{formatDate(invite.expiresAt)}</dd></div>
            </dl>
            {error && <p className="form-error">{error}</p>}
            <div className="invite-actions">
              <button className="secondary-button" type="button" onClick={onCancel} disabled={joining}>Agora não</button>
              <button className="primary-button" type="button" onClick={handleAccept} disabled={joining}>
                {joining ? `Entrando...` : `Entrar na empresa`}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
