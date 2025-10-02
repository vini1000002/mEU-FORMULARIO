// server.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'submissions.json');

app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// limite simples para reduzir abuso
const limiter = rateLimit({
  windowMs: 60*1000, // 1 minuto
  max: 30,
  message: { message: 'Muitas requisições, tente novamente mais tarde.' }
});
app.use('/api/', limiter);

// função para armazenar
async function appendSubmission(sub) {
  let arr = [];
  try {
    const content = await fs.readFile(DB_FILE, 'utf8');
    arr = JSON.parse(content || '[]');
  } catch (err) {
    // se arquivo não existe, criaremos
    if (err.code !== 'ENOENT') throw err;
  }
  arr.push(sub);
  await fs.writeFile(DB_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

function validatePayload({ name, email, phone }) {
  if (!name || typeof name !== 'string' || name.trim().length < 2) return 'Nome inválido.';
  if (!email || !/.+@.+\\..+/.test(email)) return 'E‑mail inválido.';
  if (!phone || typeof phone !== 'string' || phone.replace(/\\D/g,'').length < 8) return 'Celular inválido.';
  return null;
}

app.post('/api/submit', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const err = validatePayload({ name, email, phone });
    if (err) return res.status(400).json({ message: err });

    const submission = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      createdAt: new Date().toISOString(),
      ip: req.ip
    };

    await appendSubmission(submission);

    return res.json({ message: 'Dados recebidos com sucesso.' });
  } catch (err) {
    console.error('Erro ao salvar submission:', err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

app.listen(PORT, () => {
  console.log(Servidor rodando em http://localhost:${PORT});
})