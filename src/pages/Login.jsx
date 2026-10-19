import { useState } from "react";
import logo from "../assets/logo-new.png";
import { API_BASE, cachedFetch, friendlyError, networkError } from "../lib/api";

export default function Login({ onLogin, onSignup, onForgot, invited }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = formData.email.trim();

    if (!email || !formData.password) {
      setError("Preencha seu e-mail e sua senha para entrar.");
      return;
    }
    if (email.length > 254 || !email.includes(`@`)) {
      setError("Esse e-mail não parece válido. Confira e tente de novo.");
      return;
    }
    if (formData.password.length < 6 || formData.password.length > 72) {
      setError("A senha deve ter entre 6 e 72 caracteres.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await cachedFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password: formData.password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) setError("E-mail ou senha incorretos. Tente de novo.");
        else if (response.status === 403 && data?.code === `email_not_confirmed`) setError("Seu e-mail ainda não foi confirmado. Abra o link que enviamos para você (veja também o spam) e depois entre.");
        else setError(friendlyError(response.status, data?.error, `Não foi possível entrar agora.`));
        return;
      }
      onLogin();
    } catch {
      setError(networkError(`entrar`));
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
          <span>Bem-vindo de volta</span>
          <h1>Acesse o sistema</h1>
          <p>{invited ? `Entre para aceitar o convite da sua equipe.` : `Entre para acompanhar sua operação logística.`}</p>
        </div>

        <label className="login-field">
          <span>E-mail</span>
          <input type="email" name="email" placeholder="operador@empresa.com" value={formData.email} onChange={handleChange} autoComplete="email" />
        </label>

        <label className="login-field">
          <span>Senha</span>
          <div className="password-wrap">
            <input type={showPassword ? "text" : "password"} name="password" placeholder="Digite sua senha" value={formData.password} onChange={handleChange} autoComplete="current-password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Ocultar" : "Mostrar"}</button>
          </div>
        </label>

        {onForgot && (
          <button className="login-forgot" type="button" onClick={onForgot}>Esqueci minha senha</button>
        )}

        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="login-submit" type="submit" disabled={loading}>
          {loading ? `Entrando...` : `Entrar no sistema`}
        </button>

        <button className="login-note login-signup-link" type="button" onClick={onSignup}>
          Não tem conta? crie a sua hoje mesmo!
        </button>
      </form>
    </main>
  );
}
