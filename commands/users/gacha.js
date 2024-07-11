const {
    ActionRowBuilder,
    ButtonBuilder,
    ComponentType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const dataPath = path.join(__dirname, "..", "..", "data", "users.json");
const imagesPath = path.join(__dirname, "..", "..", "images");
const generatedImagesPath = path.join(__dirname, "..", "..", "generated_images");

const saveData = (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

const loadData = () => {
    if (!fs.existsSync(dataPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(dataPath));
};

const getItems = () => {
    const files = fs.readdirSync(imagesPath);
    return files.map((file) => ({
        name: path.parse(file).name,
        file: file,
    }));
};

// User-level cooldowns
const userCooldowns = new Map();
const buttonPressCooldowns = new Map();

// Function to generate a unique code for an item
const generateItemCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

module.exports = {
    name: "gacha",
    description: "Gacha pull command",
    async execute(message, args) {
        const userId = message.author.id;

        // Check if user is on command cooldown
        if (userCooldowns.has(userId)) {
            const expirationTime = userCooldowns.get(userId);
            if (Date.now() < expirationTime) {
                const timeLeft = (expirationTime - Date.now()) / 1000;
                const timeLeftDisplay =
                    timeLeft >= 60
                        ? `${Math.ceil(timeLeft / 60)} minutes`
                        : `${Math.ceil(timeLeft)} seconds`;
                return message.reply(
                    `You are on cooldown! Please wait ${timeLeftDisplay} before using this command again.`
                );
            }
        }

        // Set user command cooldown to 15 minutes (900,000 milliseconds)
        const userCooldownTime = 15 * 60 * 1000;
        userCooldowns.set(userId, Date.now() + userCooldownTime);

        const items = getItems();

        const shuffled = items.sort(() => 0.5 - Math.random());
        const selectedItems = shuffled.slice(0, 2);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(selectedItems[0].name)
                .setLabel(selectedItems[0].name)
                .setStyle("1"),
            new ButtonBuilder()
                .setCustomId(selectedItems[1].name)
                .setLabel(selectedItems[1].name)
                .setStyle("1")
        );

        const itemWidth = 200;
        const itemHeight = 320;
        const gap = 20;
        const canvasWidth = itemWidth * selectedItems.length + gap * (selectedItems.length - 1);
        const canvasHeight = itemHeight;

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const context = canvas.getContext("2d");

        const itemImages = await Promise.all(
            selectedItems.map((item) =>
                loadImage(path.join(imagesPath, item.file))
            )
        );

        const frameWidth = 13;
        const textSize = 20;

        context.font = `${textSize}px Arial`;

        // Load data to track prints
        const data = loadData();

        const itemPrints = selectedItems.map((item) => {
            if (!data.prints) data.prints = {};
            if (!data.prints[item.name]) data.prints[item.name] = 0;
            data.prints[item.name] += 1;
            return data.prints[item.name];
        });

        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.fillStyle = "rgba(0, 0, 0, 0)"; // Transparent background

        selectedItems.forEach((item, index) => {
            const x = index * (itemWidth + gap);
            const y = 0;
            context.drawImage(itemImages[index], x, y, itemWidth, itemHeight);
            context.lineWidth = frameWidth;
            context.strokeStyle = "rgba(0, 0, 0, 0.5)"; // Transparent frame
            context.strokeRect(x, y, itemWidth, itemHeight);
            context.fillStyle = "black";

            // Show the print number on the image during drop
            const printText = `p-${itemPrints[index]}`;

            const textX = x + itemWidth - context.measureText(item.name).width - 10;
            const textY = textSize + 10;
            const printX = x + 10;
            const printY = y + itemHeight - 10;

            context.fillText(item.name, textX, textY);
            context.fillText(printText, printX, printY);

            // Save each individual image with text
            const itemCanvas = createCanvas(itemWidth, itemHeight);
            const itemContext = itemCanvas.getContext("2d");
            itemContext.drawImage(itemImages[index], 0, 0, itemWidth, itemHeight);
            itemContext.font = `${textSize}px Arial`;
            itemContext.fillStyle = "black";

            // Add text to the item image
            itemContext.fillText(item.name, textX - x, textY);
            itemContext.fillText(printText, printX - x, printY);

            const itemBuffer = itemCanvas.toBuffer();
            fs.writeFileSync(path.join(generatedImagesPath, `${generateItemCode()}.png`), itemBuffer);
        });

        const buffer = canvas.toBuffer();

        const initialMessage = await message.channel.send({
            content: `${message.author} is dropping items! Choose one:`,
            files: [{ attachment: buffer, name: "gacha.png" }],
            components: [row],
        });

        const filter = (interaction) => interaction.isButton();

        const collector = initialMessage.createMessageComponentCollector({
            filter,
            componentType: ComponentType.Button,
            time: 60 * 1000,
        });

        collector.on("collect", async (interaction) => {
            const chosenItem = selectedItems.find(
                (item) => item.name === interaction.customId
            );

            if (chosenItem) {
                const userId = interaction.user.id;
                const data = loadData();

                // Initialize data.prints and data[userId] if they don't exist
                if (!data.prints) data.prints = {};
                if (!data[userId]) data[userId] = [];

                // Increment the print count for the chosen item
                if (!data.prints[chosenItem.name]) {
                    data.prints[chosenItem.name] = 0;
                }
                data.prints[chosenItem.name] += 1;

                // Generate a unique code for the item
                const itemCode = generateItemCode();

                // Store item data with the generated code
                data[userId].push({
                    name: chosenItem.name,
                    print: `${data.prints[chosenItem.name]}`,
                    numberOnList: data[userId].length + 1, // Assuming 1-indexed
                    code: itemCode,
                });

                // Save updated prints data
                saveData(data);

                // Set button press cooldown to 5 minutes (300,000 milliseconds)
                buttonPressCooldowns.set(userId, Date.now() + 5 * 60 * 1000);

                // Disable the pressed button
                const updatedComponents = row.components.map((component) => {
                    if (component.customId === interaction.customId) {
                        return component.setDisabled(true);
                    }
                    return component;
                });

                // Update the initial message to disable the selected button
                await initialMessage.edit({
                    components: [],
                });

                // Save the chosen item image with text
                const itemIndex = selectedItems.indexOf(chosenItem);
                const itemCanvas = createCanvas(itemWidth, itemHeight);
                const itemContext = itemCanvas.getContext("2d");
                itemContext.drawImage(itemImages[itemIndex], 0, 0, itemWidth, itemHeight);
                itemContext.font = `${textSize}px Arial`;
                itemContext.fillStyle = "black";

                // Add text to the chosen item image
                const textX = itemWidth - itemContext.measureText(chosenItem.name).width - 10;
                const textY = textSize + 10;
                const printX = 10;
                const printY = itemHeight - 10;

                itemContext.fillText(chosenItem.name, textX, textY);
                itemContext.fillText(`p-${data.prints[chosenItem.name]}`, printX, printY);

                const itemBuffer = itemCanvas.toBuffer();
                fs.writeFileSync(path.join(generatedImagesPath, `${itemCode}.png`), itemBuffer);

                // Send a new message after 2 seconds
                setTimeout(async () => {
                    await message.channel.send({
                        content: `${interaction.user} selected ${chosenItem.name}. Code: ${itemCode}`,
                    });
                }, 2000);

                // Stop collector if no more buttons are left
                if (updatedComponents.every((component) => component.disabled)) {
                    collector.stop();
                }
            }
        });

        collector.on("end", async (collected) => {
            if (collected.size === 0) {
                await initialMessage.edit({
                    content: "No one selected any item in time.",
                    components: [],
                });
            } else {
                // Remove the remaining button if time runs out
                await initialMessage.edit({
                    components: [],
                });
            }
        });
    },
};
