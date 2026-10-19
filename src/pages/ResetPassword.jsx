import { useState } from "react";
import logo from "../assets/logo-new.png";
import { API_BASE, cachedFetch, friendlyError, networkError } from "../lib/api";

export default function ResetPassword({ onDone, onRequestNew }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6 || password.length > 72) {
      setError("A senha precisa ter entre 6 e 72 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As duas senhas não são iguais.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await cachedFetch(`${API_BASE}/auth/reset-password`, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setExpired(true);
        return;
      }
      if (!response.ok) {
        if (data?.code === `same_password`) setError("A senha nova precisa ser diferente da antiga.");
        else if (data?.code === `weak_password`) setError("Essa senha é fraca demais. Tente uma mais longa.");
        else setError(friendlyError(response.status, null, `Não foi possível trocar a senha.`));
        return;
      }
      setDone(true);
      setTimeout(onDone, 1500);
    } catch {
      setError(networkError(`trocar a senha`));
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
          <h1>Nova senha</h1>
          <p>{expired ? `Esse link expirou ou já foi usado.` : `Escolha a senha que você vai usar daqui em diante.`}</p>
        </div>

        {expired ? (
          <button className="login-submit" type="button" onClick={onRequestNew}>Pedir um link novo</button>
        ) : done ? (
          <p className="login-success" role="status">Senha trocada! Entrando no sistema...</p>
        ) : (
          <>
            <label className="login-field">
              <span>Nova senha</span>
              <div className="password-wrap">
                <input type={showPassword ? "text" : "password"} name="password" placeholder="Mínimo de 6 caracteres" value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Ocultar" : "Mostrar"}</button>
              </div>
            </label>
            <label className="login-field">
              <span>Repita a senha</span>
              <input type={showPassword ? "text" : "password"} name="confirm" placeholder="Digite de novo" value={confirm} onChange={(e) => { setConfirm(e.target.value); if (error) setError(""); }} autoComplete="new-password" />
            </label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? `Salvando...` : `Salvar nova senha`}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
