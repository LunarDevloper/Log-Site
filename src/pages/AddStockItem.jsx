import { useState } from "react";
import Card from "../components/Card";
import { friendlyError, networkError, API_BASE } from "../lib/api";

export default function AddStockItem({ group, onCancel, onSave }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => ({
    name: "",
    description: "",
    quantity: 0,
    safetyStock: 1,
  }));

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError("");
  }

  function adjustNumber(field, amount, minimum) {
    setForm((current) => ({
      ...current,
      [field]: Math.max(minimum, Number(current[field] || 0) + amount),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const itemName = form.name.trim().slice(0, 32);
    if (!itemName) {
      setError("Dê um nome ao produto (até 32 caracteres).");
      return;
    }
    if (!group?.id) {
      setError("Escolha uma empresa antes de cadastrar.");
      return;
    }
    const quantity = Math.min(100000, Math.max(0, Number(form.quantity) || 0));
    const safetyStock = Math.min(100000, Math.max(0, Number(form.safetyStock) || 0));

    setIsSaving(true);
    setError("");
    try {
      const createRes = await fetch(`${API_BASE}/groups/${group.id}/items`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemName,
          description: form.description.trim().slice(0, 1000),
        }),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        setError(friendlyError(createRes.status, createData?.error, `Não foi possível criar o produto.`));
        return;
      }
      if (quantity > 0) {
        const addRes = await fetch(`${API_BASE}/groups/${group.id}/inventory/add`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: itemName, amount: quantity }),
        });
        const addData = await addRes.json().catch(() => ({}));
        if (!addRes.ok) {
          setError(`Produto criado, mas a quantidade inicial não entrou. ${friendlyError(addRes.status, addData?.error, ``)}`);
          return;
        }
      }
      if (safetyStock > 0) {
        await fetch(`${API_BASE}/groups/${group.id}/items`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: itemName, SecurityLimit: safetyStock }),
        }).catch(() => null);
      }
      await onSave?.({ name: itemName });
    } catch {
      setError(networkError(`salvar o produto`));
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
          <p>{group ? `Cadastrando em ${group.name}.` : `Escolha uma empresa.`}</p>
        </div>

        <button className="secondary-button" type="button" onClick={onCancel}>
          Voltar
        </button>
      </div>

      <Card title="Dados do item" subtitle="Nome até 32 caracteres · descrição até 1000">
        <form className="stock-form" onSubmit={handleSubmit}>
          <label className="form-field form-field--full">
            <span>Nome *</span>
            <input name="name" value={form.name} onChange={updateField} maxLength={32} placeholder="Ex: Parafuso M6" required />
          </label>

          <label className="form-field form-field--full">
            <span>Descrição</span>
            <textarea name="description" value={form.description} onChange={updateField} rows="4" maxLength={1000} placeholder="Detalhes do produto (opcional)" />
          </label>

          <label className="form-field">
            <span>Quantidade inicial</span>
            <div className="number-control">
              <input name="quantity" type="number" min="0" max="100000" step="1" value={form.quantity} onChange={updateField} />
              <div className="number-arrows">
                <button type="button" onClick={() => adjustNumber("quantity", 1, 0)} aria-label="Aumentar quantidade">▲</button>
                <button type="button" onClick={() => adjustNumber("quantity", -1, 0)} aria-label="Diminuir quantidade">▼</button>
              </div>
            </div>
          </label>

          <label className="form-field">
            <span>Estoque de segurança</span>
            <div className="number-control">
              <input name="safetyStock" type="number" min="0" max="100000" step="1" value={form.safetyStock} onChange={updateField} />
              <div className="number-arrows">
                <button type="button" onClick={() => adjustNumber("safetyStock", 1, 0)} aria-label="Aumentar estoque de segurança">▲</button>
                <button type="button" onClick={() => adjustNumber("safetyStock", -1, 0)} aria-label="Diminuir estoque de segurança">▼</button>
              </div>
            </div>
            <small>Avisa quando a quantidade chegar nesse nível.</small>
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
