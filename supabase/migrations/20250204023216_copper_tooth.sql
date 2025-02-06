/*
  # Criação da tabela de transações

  1. Nova Tabela
    - `transactions`
      - `id` (uuid, chave primária)
      - `user_id` (uuid, referência ao usuário autenticado)
      - `description` (texto)
      - `amount` (decimal)
      - `category` (texto)
      - `date` (timestamp com timezone)
      - `type` (texto, 'income' ou 'expense')
      - `created_at` (timestamp com timezone)

  2. Segurança
    - Habilitar RLS na tabela transactions
    - Adicionar políticas para que usuários possam:
      - Ler apenas suas próprias transações
      - Criar novas transações
      - Atualizar suas próprias transações
      - Deletar suas próprias transações
*/

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  category text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ler suas próprias transações"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias transações"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias transações"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias transações"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);