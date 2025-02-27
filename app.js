const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { Bot } = require('grammy');
const { nanoid } = require('nanoid');
require('dotenv').config();

const app = express();
app.use(express.json());

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const CHANNEL_ID = process.env.CHANNEL_ID;

app.post('/v2/save', async (req, res) => {
    try {
        if (!req.is('application/json')) {
            return res.status(400).json({ error: 'Invalid JSON format' });
        }
        
        const data = req.body;
        const id = nanoid(10);
        const filePath = path.join(__dirname, 'data', `${id}.json`);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeJson(filePath, data, { spaces: 2 });

        const link = `https://yourdomain.com/v2/${id}.json`;
        await bot.api.sendMessage(CHANNEL_ID, `🆕 New JSON Stored!\n🔑 ID: ${id}\n🔗 Access: ${link}`);

        res.status(200).json({ success: true, id, link });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

app.get('/v2/:id.json', async (req, res) => {
    const { id } = req.params;
    const filePath = path.join(__dirname, 'data', `${id}.json`);

    if (await fs.pathExists(filePath)) {
        const data = await fs.readJson(filePath);
        res.status(200).json(data);
    } else {
        res.status(404).json({ error: 'Data not found' });
    }
});

app.put('/v2/:id.edit', async (req, res) => {
    const { id } = req.params;
    const filePath = path.join(__dirname, 'data', `${id}.json`);

    if (await fs.pathExists(filePath)) {
        try {
            if (!req.is('application/json')) {
                return res.status(400).json({ error: 'Invalid JSON format' });
            }

            const data = req.body;
            await fs.writeJson(filePath, data, { spaces: 2 });
            res.status(200).json({ success: true, id, message: 'Data updated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update data', details: error.message });
        }
    } else {
        res.status(404).json({ error: 'Data not found' });
    }
});

app.delete('/v2/:id.delete', async (req, res) => {
    const { id } = req.params;
    const filePath = path.join(__dirname, 'data', `${id}.json`);

    if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        res.status(200).json({ success: true, message: 'Data deleted successfully' });
    } else {
        res.status(404).json({ error: 'Data not found' });
    }
});

app.post('/v2/:id.clear', async (req, res) => {
    const { id } = req.params;
    const filePath = path.join(__dirname, 'data', `${id}.json`);

    if (await fs.pathExists(filePath)) {
        await fs.writeJson(filePath, {}, { spaces: 2 });
        res.status(200).json({ success: true, message: 'Data cleared successfully' });
    } else {
        res.status(404).json({ error: 'Data not found' });
    }
});

app.use(['/','/v2'], (req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Runn on ::${PORT}`);
});
