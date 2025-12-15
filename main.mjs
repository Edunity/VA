import { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
} from "discord.js";
import { 
    GoogleGenerativeAI, 
} from "@google/generative-ai";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const CHANNEL_ID = "1450172846893568000";

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

const imageMap = new Map();

client.once("ready", () => {
    console.log("woke up.");
});

client.on("messageCreate", async (message) => {
    try {
        if (message.author.bot) {
            return;
        }

        if(message.channel.id != CHANNEL_ID) {
            return;
        }

        if(message.attachments.size > 0) {
            const images = message.attachments.filter(item =>
                item.contentType?.startsWith("image/") || item.name?.match(/.(jpg|jpeg|png|gif)$/i)
            );

            if (images.size > 0) {
                const image = images.first();

                const imageId = `${message.id}-${Date.now()}`;
                imageMap.set(imageId, image.url);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`AM:${imageId}`)
                        .setLabel("AM")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`PM:${imageId}`)
                        .setLabel("PM")
                        .setStyle(ButtonStyle.Primary)
                );

                await message.reply({
                    content: "Which shift would you like to extract?",
                    components: [row],
                });
            } else {

            }
        }
        else {
            const result = await model.generateContent(message.content);
            const text = result.response.text();

            await message.reply(text);
        }
    } catch (error) {
        await message.reply("error.");

        console.error(error);
    }
});

client.on("interactionCreate", async (interaction) => {
    try {
        if (!interaction.isButton()) {
            return;
        }

        const [shift, imageId] = interaction.customId.split(":");
        const imageUrl = imageMap.get(imageId);

        await interaction.deferReply();

        if (!imageUrl) {
            await interaction.editReply("Failed to retrieve the image.");
            return;
        }

        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");

        const prompt = `
            この画像は左右2つに分かれたシフト記録で、左側がAM、右側がPMです。
            ${shift}のみから以下の項目に記述してある手書き文を抽出してください。
            抽出した手書き文からは改行は取り除いてください。
            何も記述されてない項目の手書き文は"-"としてください。
            「Highlights」
            「Challenges」
            「Comments/Observations」
            「Unanswered Questions」
            抽出した手書き文のみを|||区切りで返してください。
            抽出結果は必ず次の形式で1行のみ返してください。
            順番は変更しないでください。
            Highlightsの手書き文|||Challengesの手書き文|||Comments/Observationsの手書き文|||Unanswered Questionsの手書き文
            余計な説明や前置きは不要です。
            テキストのみ返してください。
        `;

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/png",
                },
            },
        ]);

        const text = result.response.text().replace(/\|\|\|/g, "\t");
        await interaction.editReply(text);
    } catch (error) {
        await interaction.editReply("error.");

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
