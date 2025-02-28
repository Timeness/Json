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
const API_BASE_URL = "http://localhost:5600/v2";

async function sendErrorToChannel(error) {
    try {
        await bot.api.sendMessage(CHANNEL_ID, `❌ Error:\n\`\`\`${error}\`\`\``, { parse_mode: "Markdown" });
    } catch (err) {
        console.error("Failed to send error to Telegram:", err);
    }
}

app.post('/v2/save', async (req, res) => {
    try {
        if (!req.is('application/json')) return res.status(400).json({ error: 'Invalid JSON format' });

        const id = nanoid(10);
        const filePath = path.join(__dirname, 'data', `${id}.json`);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeJson(filePath, req.body, { spaces: 2 });

        const link = `http://localhost:5600/v2/${id}.json`;
        await bot.api.sendMessage(CHANNEL_ID, `🆕 New JSON Stored!\n🔑 ID: ${id}\n🔗 Access: ${link}`);

        res.json({ success: true, id, link });
    } catch (error) {
        await sendErrorToChannel(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/v2/:id.json', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', `${req.params.id}.json`);
        if (await fs.pathExists(filePath)) {
            res.json(await fs.readJson(filePath));
        } else {
            res.status(404).json({ error: 'Data not found' });
        }
    } catch (error) {
        await sendErrorToChannel(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/v2/:id.edit', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', `${req.params.id}.json`);
        if (!(await fs.pathExists(filePath))) return res.status(404).json({ error: 'Data not found' });

        if (!req.is('application/json')) return res.status(400).json({ error: 'Invalid JSON format' });

        await fs.writeJson(filePath, req.body, { spaces: 2 });
        res.json({ success: true, message: 'Data updated successfully' });
    } catch (error) {
        await sendErrorToChannel(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/v2/:id.delete', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', `${req.params.id}.json`);
        if (!(await fs.pathExists(filePath))) return res.status(404).json({ error: 'Data not found' });

        await fs.remove(filePath);
        res.json({ success: true, message: 'Data deleted successfully' });
    } catch (error) {
        await sendErrorToChannel(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/v2/:id.clear', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', `${req.params.id}.json`);
        if (!(await fs.pathExists(filePath))) return res.status(404).json({ error: 'Data not found' });

        await fs.writeJson(filePath, {}, { spaces: 2 });
        res.json({ success: true, message: 'Data cleared successfully' });
    } catch (error) {
        await sendErrorToChannel(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

bot.command("save", async (ctx) => {
    const reply = ctx.message.reply_to_message;
    if (!reply || !reply.text) return ctx.reply("❌ Please reply to a JSON message using /save.");

    try {
        const response = await axios.post(`${API_BASE_URL}/save`, JSON.parse(reply.text));
        ctx.reply(`✅ JSON saved!\n🔑 ID: ${response.data.id}\n🔗 [Access Here](${response.data.link})`, { parse_mode: "Markdown" });
    } catch (error) {
        await sendErrorToChannel(error.message);
        ctx.reply("❌ Invalid JSON format or server error.");
    }
});

bot.command("edit", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("❌ Usage: /edit {id} (Reply with JSON)");

    const reply = ctx.message.reply_to_message;
    if (!reply || !reply.text) return ctx.reply("❌ Please reply to a JSON message to update.");

    try {
        await axios.put(`${API_BASE_URL}/${args[1]}.edit`, JSON.parse(reply.text));
        ctx.reply(`✅ JSON updated for ID: \`${args[1]}\``, { parse_mode: "Markdown" });
    } catch (error) {
        await sendErrorToChannel(error.message);
        ctx.reply("❌ Invalid JSON format or ID not found.");
    }
});

bot.command("delete", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("❌ Usage: /delete {id}");

    try {
        await axios.delete(`${API_BASE_URL}/${args[1]}.delete`);
        ctx.reply(`✅ JSON deleted for ID: \`${args[1]}\``, { parse_mode: "Markdown" });
    } catch (error) {
        await sendErrorToChannel(error.message);
        ctx.reply("❌ ID not found or deletion failed.");
    }
});

bot.command("clear", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("❌ Usage: /clear {id}");

    try {
        await axios.post(`${API_BASE_URL}/${args[1]}.clear`);
        ctx.reply(`✅ JSON cleared for ID: \`${args[1]}\``, { parse_mode: "Markdown" });
    } catch (error) {
        await sendErrorToChannel(error.message);
        ctx.reply("❌ ID not found or clearing failed.");
    }
});

bot.command("get", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("❌ Usage: /get {id}");

    try {
        const response = await axios.get(`${API_BASE_URL}/${args[1]}.json`);
        ctx.reply(`📄 JSON Data for ID: \`${args[1]}\`:\n\`\`\`${JSON.stringify(response.data, null, 2)}\`\`\``, { parse_mode: "Markdown" });
    } catch (error) {
        await sendErrorToChannel(error.message);
        ctx.reply("❌ ID not found.");
    }
});

bot.catch(async (err) => {
    console.error("Bot Error:", err);
    await sendErrorToChannel(err.message);
});

bot.start();

const PORT = process.env.PORT || 5600;
app.listen(PORT, () => console.log(`Running on ::${PORT}`));
