import { Client, GatewayIntentBits } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const ai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = ai.getGenerativeModel({ 
    model: "gemini-2.5-flash", 
});

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

client.on("messageCreate", async (message) => {
    try {
        if (message.author.bot) {
            return;
        }

        if (message.content.toLowerCase().includes("test")) {
            await message.react("🏓");
        }
        else {
            if(message.attachments.size > 0) {
                const images = message.attachments.filter(item =>
                    item.contentType?.startsWith("image/") || item.name?.match(/.(jpg|jpeg|png|gif)$/i)
                );

                if (images.size > 0) {
                    const image = images.first();
                    const imageUrl = image.url;

                    const response = await fetch(imageUrl);
                    const buffer = await response.arrayBuffer();
                    const base64Image = Buffer.from(buffer).toString("base64");

                    const prompt = `
                    この画像は左右で2つに分かれたシフト記録で、左側がAMシフトの表、右側がPMシフトの表です。
                    画像の中からAMとPM別々に以下の11項目のテキストを抽出してください。
                    「Date」
                    「Shift Leader(s)」
                    「Volunteers on shift」
                    「Guest Contacts」
                    「Security/Animal-related radio calls」
                    「GE/Building Services-related radio calls」
                    「Highlights」
                    「Challenges」
                    「Comments/Observations」
                    「Unanswered Questions」
                    「Actions to follow up on」
                    AMとPM別々に抽出結果かわかるように返してください。
                    各抽出結果だけを横一列にExcelに入力できるように、Tabで区切ったものも返してください。
                    余計な説明や前置きは不要です。
                    テキストのみ返してください。
                    `;

                    const result = await model.generateContent([
                        {
                            text: prompt,
                        },
                        {
                            inlineData: {
                                data: base64Image,
                                mimeType: image.contentType || "image/png",
                            },
                        },
                    ]);

                    const text = result.response.text();

                    await message.reply(text);
                }
                else {

                }
            }
            else {
                const result = await model.generateContent(message.content);
                const text = result.response.text();

                await message.reply(text);
            }
        }
    } catch (error) {
        await message.reply("error.");

        console.error(error);
    }
});

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

client.login(process.env.DISCORD_TOKEN);
