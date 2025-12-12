import { Client, GatewayIntentBits } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// === Gemini 初期化 ===
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// === Discord Bot 初期化 ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.once("ready", () => {
    console.log("woke up.");
});

// === メッセージイベント ===
client.on("messageCreate", async (message) => {
    try {
        if (message.author.bot) return;

        // test と書かれたらリアクション
        if (message.content.toLowerCase().includes("test")) {
            await message.react("🏓");
            return;
        }

        // Gemini 応答
        const result = await model.generateContent(message.content);
        const replyText = result.response.text();

        await message.reply(replyText);

    } catch (error) {
        console.error("Error:", error);
        await message.reply("エラーが発生しました。");
    }
});

// === ステータスページ ===
app.get("/", (req, res) => {
    res.json({
        status: "Bot is running",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

app.listen(PORT, () => {
    console.log("Starting server on port " + PORT);
});

// === ログイン ===
client.login(process.env.DISCORD_TOKEN);