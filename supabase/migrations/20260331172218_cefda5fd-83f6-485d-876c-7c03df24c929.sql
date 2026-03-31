
-- Seed Vehicles
INSERT INTO public.vehicles (name, brand, model, year, plate, color, category, daily_rate, weekly_rate, monthly_rate, description, status) VALUES
('Corolla GLi', 'Toyota', 'Corolla', 2024, 'ABC-1234', 'Branco', 'sedan', 180, 1100, 3800, 'Sedan confortável e econômico', 'available'),
('Civic EXL', 'Honda', 'Civic', 2023, 'DEF-5678', 'Preto', 'sedan', 200, 1250, 4200, 'Sedan premium com tecnologia', 'rented'),
('HB20 Sense', 'Hyundai', 'HB20', 2024, 'GHI-9012', 'Prata', 'hatch', 120, 750, 2600, 'Compacto econômico', 'available'),
('T-Cross Comfortline', 'VW', 'T-Cross', 2024, 'JKL-3456', 'Cinza', 'suv', 220, 1400, 4800, 'SUV compacto versátil', 'rented'),
('Onix Plus', 'Chevrolet', 'Onix Plus', 2024, 'MNO-7890', 'Vermelho', 'sedan', 140, 850, 3000, 'Sedan com bom custo-benefício', 'maintenance'),
('Kicks Advance', 'Nissan', 'Kicks', 2023, 'PQR-1234', 'Azul', 'suv', 210, 1300, 4500, 'SUV espaçoso e conectado', 'available');

-- Seed Customers
INSERT INTO public.customers (name, phone, cpf, status) VALUES
('João Silva', '(11) 99999-1111', '123.456.789-00', 'active'),
('Maria Santos', '(11) 99999-2222', '234.567.890-11', 'active'),
('Carlos Lima', '(21) 98888-3333', '345.678.901-22', 'active'),
('Ana Costa', '(31) 97777-4444', '456.789.012-33', 'active'),
('Pedro Oliveira', '(41) 96666-5555', '567.890.123-44', 'inactive');

-- Seed Rentals (using subqueries to get IDs)
INSERT INTO public.rentals (vehicle_id, customer_id, pickup_date, return_date, total_value, rental_status, payment_status, origin)
SELECT v.id, c.id, '2026-03-15', '2026-03-30', 2700, 'active', 'paid', 'manual'
FROM public.vehicles v, public.customers c WHERE v.plate = 'ABC-1234' AND c.cpf = '123.456.789-00';

INSERT INTO public.rentals (vehicle_id, customer_id, pickup_date, return_date, total_value, rental_status, payment_status, origin)
SELECT v.id, c.id, '2026-03-10', '2026-03-25', 3000, 'active', 'overdue', 'chatbot'
FROM public.vehicles v, public.customers c WHERE v.plate = 'DEF-5678' AND c.cpf = '234.567.890-11';

INSERT INTO public.rentals (vehicle_id, customer_id, pickup_date, return_date, total_value, rental_status, payment_status, origin)
SELECT v.id, c.id, '2026-04-01', '2026-04-08', 840, 'pending', 'pending', 'chatbot'
FROM public.vehicles v, public.customers c WHERE v.plate = 'GHI-9012' AND c.cpf = '345.678.901-22';

INSERT INTO public.rentals (vehicle_id, customer_id, pickup_date, return_date, total_value, rental_status, payment_status, origin)
SELECT v.id, c.id, '2026-03-05', '2026-04-05', 4800, 'active', 'paid', 'manual'
FROM public.vehicles v, public.customers c WHERE v.plate = 'JKL-3456' AND c.cpf = '456.789.012-33';

INSERT INTO public.rentals (vehicle_id, customer_id, pickup_date, return_date, total_value, rental_status, payment_status, origin)
SELECT v.id, c.id, '2026-02-01', '2026-02-15', 3150, 'completed', 'paid', 'chatbot'
FROM public.vehicles v, public.customers c WHERE v.plate = 'PQR-1234' AND c.cpf = '567.890.123-44';

-- Seed Payments
INSERT INTO public.payments (rental_id, amount, due_date, status, paid_at)
SELECT r.id, 2700, '2026-03-30', 'paid', '2026-03-28T10:00:00Z'
FROM public.rentals r JOIN public.customers c ON r.customer_id = c.id WHERE c.cpf = '123.456.789-00' LIMIT 1;

INSERT INTO public.payments (rental_id, amount, due_date, status)
SELECT r.id, 3000, '2026-03-25', 'overdue'
FROM public.rentals r JOIN public.customers c ON r.customer_id = c.id WHERE c.cpf = '234.567.890-11' LIMIT 1;

INSERT INTO public.payments (rental_id, amount, due_date, status)
SELECT r.id, 840, '2026-04-08', 'pending'
FROM public.rentals r JOIN public.customers c ON r.customer_id = c.id WHERE c.cpf = '345.678.901-22' LIMIT 1;

INSERT INTO public.payments (rental_id, amount, due_date, status)
SELECT r.id, 4800, '2026-04-05', 'pending'
FROM public.rentals r JOIN public.customers c ON r.customer_id = c.id WHERE c.cpf = '456.789.012-33' LIMIT 1;

INSERT INTO public.payments (rental_id, amount, due_date, status, paid_at)
SELECT r.id, 3150, '2026-02-15', 'paid', '2026-02-14T10:00:00Z'
FROM public.rentals r JOIN public.customers c ON r.customer_id = c.id WHERE c.cpf = '567.890.123-44' LIMIT 1;

-- Seed Chatbot Flow
INSERT INTO public.chatbot_flows (name, description, status, version, nodes, edges) VALUES
('Atendimento Inicial', 'Fluxo principal de atendimento ao cliente via WhatsApp', 'active', 1,
'[{"id":"1","type":"flowNode","position":{"x":250,"y":50},"data":{"label":"Mensagem Recebida","category":"trigger","nodeType":"message_received","config":{},"description":"Início do fluxo"}},{"id":"2","type":"flowNode","position":{"x":250,"y":180},"data":{"label":"Enviar Menu","category":"message","nodeType":"send_options","config":{"message":"Olá! Como posso ajudar?\\n1. Ver carros\\n2. Fazer reserva\\n3. Falar com atendente"},"description":"Menu principal"}},{"id":"3","type":"flowNode","position":{"x":250,"y":320},"data":{"label":"Aguardar Resposta","category":"automation","nodeType":"wait_response","config":{},"description":"Espera resposta do cliente"}},{"id":"4","type":"flowNode","position":{"x":250,"y":460},"data":{"label":"Verificar Opção","category":"logic","nodeType":"if_else","config":{"condition":"{{resposta}} == ''1''"},"description":"Verifica escolha do cliente"}},{"id":"5","type":"flowNode","position":{"x":100,"y":600},"data":{"label":"Buscar Veículos","category":"database","nodeType":"search_vehicles","config":{},"description":"Busca carros disponíveis"}},{"id":"6","type":"flowNode","position":{"x":400,"y":600},"data":{"label":"Transferir Humano","category":"automation","nodeType":"transfer_human","config":{},"description":"Redireciona para atendente"}}]',
'[{"id":"e1-2","source":"1","target":"2","animated":true},{"id":"e2-3","source":"2","target":"3","animated":true},{"id":"e3-4","source":"3","target":"4","animated":true},{"id":"e4-5","source":"4","target":"5","animated":true},{"id":"e4-6","source":"4","sourceHandle":"false","target":"6"}]');

-- Seed WhatsApp Config
INSERT INTO public.whatsapp_config (instance_name, base_url, api_token, webhook_url, status) VALUES
('Locadora Principal', 'https://api.whatsapi.com.br', '', 'https://seusite.com/api/webhook', 'disconnected');

-- Seed Settings
INSERT INTO public.settings (key, value) VALUES
('company_name', 'LocaVeículos'),
('company_cnpj', '12.345.678/0001-90'),
('company_phone', '(11) 3000-0000'),
('notification_payment_reminder', 'true'),
('notification_overdue_alert', 'true'),
('notification_return_reminder', 'true'),
('notification_whatsapp_booking', 'true');

-- Seed Notifications
INSERT INTO public.notifications (title, message, type, read) VALUES
('Devolução próxima', 'Devolução de Toyota Corolla - João Silva em 2 dias', 'warning', false),
('Pagamento vencido', 'Pagamento vencido - Maria Santos (Civic)', 'error', false),
('Nova reserva', 'Nova reserva via WhatsApp - Carlos Lima', 'info', false),
('Manutenção concluída', 'Veículo HB20 retornou da manutenção', 'success', true);
