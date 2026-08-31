import { useState } from "react";
import Card from "../components/Card";

function createItemId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `item-${Date.now()}`;
}

export default function AddStockItem({ onCancel, onSave }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => ({
    id: createItemId(),
    name: "",
    description: "",
    quantity: 0,
    safetyStock: 1,
    createdAt: new Date().toISOString(),
  }));

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function adjustNumber(field, amount, minimum) {
    setForm((current) => ({
      ...current,
      [field]: Math.max(minimum, Number(current[field] || 0) + amount),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      await onSave?.({
        ...form,
        quantity: Number(form.quantity),
        safetyStock: Number(form.safetyStock),
      });
    } catch (saveError) {
      setError(saveError.message ?? "Não foi possível salvar o item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span>Início / Estoque / Novo item</span>
          <h1>Adicionar item</h1>
          <p>Cadastre as informações do novo produto.</p>
        </div>

        <button className="secondary-button" type="button" onClick={onCancel}>
          Voltar
        </button>
      </div>

      <Card title="Dados do item" subtitle="Preencha os campos obrigatórios para continuar">
        <form className="stock-form" onSubmit={handleSubmit}>
          <label className="form-field form-field--full">
            <span>Nome</span>
            <input name="name" value={form.name} onChange={updateField} required />
          </label>

          <label className="form-field form-field--full">
            <span>Descrição</span>
            <textarea name="description" value={form.description} onChange={updateField} rows="4" required />
          </label>

          <label className="form-field">
            <span>Quantidade</span>
            <div className="number-control">
              <input name="quantity" type="number" min="0" step="1" value={form.quantity} onChange={updateField} required />
              <div className="number-arrows">
                <button type="button" onClick={() => adjustNumber("quantity", 1, 0)} aria-label="Aumentar quantidade">▲</button>
                <button type="button" onClick={() => adjustNumber("quantity", -1, 0)} aria-label="Diminuir quantidade">▼</button>
              </div>
            </div>
          </label>

          <label className="form-field">
            <span>Estoque de segurança</span>
            <div className="number-control">
              <input name="safetyStock" type="number" min="1" step="1" value={form.safetyStock} onChange={updateField} required />
              <div className="number-arrows">
                <button type="button" onClick={() => adjustNumber("safetyStock", 1, 1)} aria-label="Aumentar estoque de segurança">▲</button>
                <button type="button" onClick={() => adjustNumber("safetyStock", -1, 1)} aria-label="Diminuir estoque de segurança">▼</button>
              </div>
            </div>
            <small>O valor deve ser maior que zero.</small>
          </label>

          <label className="form-field">
            <span>ID</span>
            <input value={form.id} readOnly />
          </label>

          <label className="form-field">
            <span>Data de criação</span>
            <input value={new Date(form.createdAt).toLocaleString("pt-BR")} readOnly />
          </label>

          {error && <p className="form-error form-field--full" role="alert">{error}</p>}

          <div className="form-actions form-field--full">
            <button className="secondary-button" type="button" onClick={onCancel} disabled={isSaving}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar item"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
