import { useState } from "react";
import logo from "../assets/logo-new.png";
import { API_BASE, cachedFetch, friendlyError, networkError } from "../lib/api";

export default function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || value.length > 254 || !value.includes(`@`)) {
      setError("Digite o e-mail da sua conta.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await cachedFetch(`${API_BASE}/auth/forgot-password`, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ email: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 429 && data?.code === `email_rate_limit`) {
        setError("O envio de e-mails atingiu o limite agora. Espere alguns minutos e tente de novo.");
        return;
      }
      if (!response.ok) {
        setError(friendlyError(response.status, null, `Não foi possível enviar o e-mail agora.`));
        return;
      }
      setSent(true);
    } catch {
      setError(networkError(`enviar o e-mail`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page login-page--centered">
      <div className="login-background-grid" />
      <form className="login-card login-card--centered" onSubmit={handleSubmit}>
        <img src={logo} alt="Buddylog" className="login-centered-logo" />
        <div className="login-heading login-heading--centered">
          <span>Recuperar acesso</span>
          <h1>Esqueci minha senha</h1>
          <p>{sent ? `Pronto! Confira seu e-mail.` : `Mandamos um link para você criar uma senha nova.`}</p>
        </div>

        {sent ? (
          <p className="login-success" role="status">
            Se existir uma conta com <strong>{email.trim()}</strong>, o link já está a caminho. Abra o link <strong>neste mesmo navegador</strong>. Não achou? Veja o spam.
          </p>
        ) : (
          <>
            <label className="login-field">
              <span>E-mail</span>
              <input type="email" name="email" placeholder="operador@empresa.com" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }} autoComplete="email" />
            </label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? `Enviando...` : `Enviar link`}
            </button>
          </>
        )}

        <button className="login-note login-signup-link" type="button" onClick={onBackToLogin}>
          Voltar para o login
        </button>
      </form>
    </main>
  );
}
