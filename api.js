const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { Bot } = require('grammy');
const { nanoid } = require('nanoid');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const CHANNEL_ID = process.env.CHANNEL_ID;
const API_BASE_URL = "http://localhost:3300/v2";

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

        const link = `http://localhost:3300/v2/${id}.json`;
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

bot.command("save", async (ctx) => {
    const reply = ctx.message.reply_to_message;

    if (!reply || !reply.text) {
        return ctx.reply("❌ Please reply to a JSON message using /save.");
    }

    try {
        const jsonData = JSON.parse(reply.text);
        const response = await axios.post(`${API_BASE_URL}/save`, jsonData);
        ctx.reply(`✅ JSON saved!\n🔑 ID: ${response.data.id}\n🔗 [Access Here](${response.data.link})`, { parse_mode: "Markdown" });
    } catch (error) {
        ctx.reply("❌ Invalid JSON format or server error.");
    }
});

bot.command("edit", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("❌ Usage: /edit {id} (Reply with JSON)");

    const id = args[1];
    const reply = ctx.message.reply_to_message;
    
    if (!reply || !reply.text) {
        return ctx.reply("❌ Please reply to a JSON message to update.");
    }

    try {
        const jsonData = JSON.parse(reply.text);
        await axios.put(`${API_BASE_URL}/${id}.edit`, jsonData);
        ctx.reply(`✅ JSON updated successfully for ID: \`${id}\``, { parse_mode: "Markdown" });
    } catch (error) {
        ctx.reply("❌ Invalid JSON format or ID not found.");
    }
});

bot.command("delete", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("❌ Usage: /delete {id}");

    const id = args[1];

    try {
        await axios.delete(`${API_BASE_URL}/${id}.delete`);
        ctx.reply(`✅ JSON deleted successfully for ID: \`${id}\``, { parse_mode: "Markdown" });
    } catch (error) {
        ctx.reply("❌ ID not found or deletion failed.");
    }
});

bot.command("clear", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("❌ Usage: /clear {id}");

    const id = args[1];

    try {
        await axios.post(`${API_BASE_URL}/${id}.clear`);
        ctx.reply(`✅ JSON cleared for ID: \`${id}\``, { parse_mode: "Markdown" });
    } catch (error) {
        ctx.reply("❌ ID not found or clearing failed.");
    }
});

bot.command("get", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("❌ Usage: /get {id}");

    const id = args[1];

    try {
        const response = await axios.get(`${API_BASE_URL}/${id}.json`);
        ctx.reply(`📄 JSON Data for ID: \`${id}\`:\n\`\`\`${JSON.stringify(response.data, null, 2)}\`\`\``, { parse_mode: "Markdown" });
    } catch (error) {
        ctx.reply("❌ ID not found.");
    }
});

bot.start();

const PORT = process.env.PORT || 3300;
app.listen(PORT, () => {
    console.log(`Runn on ::${PORT}`);
});
