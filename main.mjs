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

const CHANNEL_ID = "1449139165911580815";

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

const imageStore = new Map();

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
                imageStore.set(imageId, image.url);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`select_am:${imageId}`)
                        .setLabel("AM")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`select_pm:${imageId}`)
                        .setLabel("PM")
                        .setStyle(ButtonStyle.Secondary)
                );

                await message.reply({
                    content: "どちらのシフトを抽出しますか？",
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
    if (!interaction.isButton()) {
        return;
    }

    const [type, imageId] = interaction.customId.split(":");
    const shiftType = type === "select_am" ? "AM" : "PM";
    const imageUrl = imageStore.get(imageId);

    await interaction.deferReply();

    if (!imageUrl) {
        await interaction.editReply("画像URLが取得できませんでした。");
        return;
    }

    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    const prompt = `
この画像は左右2つに分かれたシフト記録で、左側がAM、右側がPMです。
${shiftType}のみから以下の項目に記述してある手書きの文を抽出してください。

「Highlights」
「Challenges」
「Comments/Observations」
「Unanswered Questions」

抽出した手書きの文のみをExcelに貼れるようTab区切りで返してください。
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

    await interaction.editReply(result.response.text());
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
