import { Client, GatewayIntentBits } from "discord.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import express from "express";

const ai = new GoogleGenAI({});
const app = express();

const PORT = process.env.PORT || 3000;

const CHANNEL_ID = "1449139165911580815";

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           
        GatewayIntentBits.GuildMessages,    
        GatewayIntentBits.MessageContent,   
        GatewayIntentBits.GuildMembers,     
    ],
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error(error);
    
    process.exit(1);
});

client.once("ready", () => {
    console.log("woke up.");
});

client.on("messageCreate", async (message) => {
    try {
        if (message.author.bot) {
            return;
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: message.content,
        });

        await message.reply(response.text);
    } catch (error) {
        console.error(error);
    }
});

app.get("/", (request, response) => {
    response.json({
        status: "Bot is running",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log("Starting Server on port " + PORT + ".");
});