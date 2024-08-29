const { createCanvas, loadImage, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");
const { EmbedBuilder, Guild } = require("discord.js");


// Register custom fonts
registerFont(
    path.join(__dirname, "..", "..", "assets", "CinzelDecorative.ttf"),
    { family: "Cinzel Decorative" },
);
registerFont(path.join(__dirname, "..", "..", "assets", "outfit.ttf"), {
    family: "outfit",
});

const cooldownPath = path.join(__dirname, "..", "..", "data", "cooldowns.json");
const currencyPath = path.join(__dirname, "..", "..", "data", "currency.json");
const GACHA_COOLDOWN = 5 * 60 * 1000; // 10 minutes in milliseconds
const EGACHA_COOLDOWN = 20 * 1000; // 20 seconds for Egacha item

// Define paths
const baseImagesPath = path.join(__dirname, "..", "..", "images");
const framesPath = path.join(__dirname, "..", "..", "frames");
const generatedImagesPath = path.join(
    __dirname,
    "..",
    "..",
    "generated_images",
);
const dataPath = path.join(__dirname, "..", "..", "data", "cards.json");

// Rarity levels and their respective folders for images and frames
const rarities = {
    common: "common",
    rare: "rare",
    legendary: "legendary",
    unique: "unique",
};

// Custom emojis for rarities
const rarityEmojis = {
    unique: "<a:uniquee:1274020241214672927>",
    legendary: ":first_place:",
    rare: ":second_place:",
    common: ":third_place:",
};

// Probability distribution for rarities
const rarityChances = {
    common: 60,
    rare: 25,
    legendary: 10,
    unique: 5,
};

// Ensure directories and files exist
const ensureDirectoriesAndFilesExist = () => {
    Object.values(rarities).forEach((rarity) => {
        const rarityImagePath = path.join(baseImagesPath, rarity);
        const rarityFramePath = path.join(framesPath, rarity);

        if (!fs.existsSync(rarityImagePath)) {
            fs.mkdirSync(rarityImagePath, { recursive: true });
            console.log(`Created missing directory: ${rarityImagePath}`);
        }

        if (!fs.existsSync(rarityFramePath)) {
            fs.mkdirSync(rarityFramePath, { recursive: true });
            console.log(`Created missing directory: ${rarityFramePath}`);
        }
    });

    if (!fs.existsSync(generatedImagesPath)) {
        fs.mkdirSync(generatedImagesPath, { recursive: true });
        console.log(`Created missing directory: ${generatedImagesPath}`);
    }

    if (!fs.existsSync(path.dirname(dataPath))) {
        fs.mkdirSync(path.dirname(dataPath), { recursive: true });
        console.log(`Created missing directory: ${path.dirname(dataPath)}`);
    }

    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(dataPath, JSON.stringify({}));
        console.log(`Created missing file: ${dataPath}`);
    }
};

// Save data function
const saveData = (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

// Load data function
const loadData = () => {
    if (!fs.existsSync(dataPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(dataPath));
};

// Function to generate a random 6-character code (alphanumeric)
const generateUniqueCode = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(
            Math.floor(Math.random() * characters.length),
        );
    }
    return code;
};

// Function to pick a random image and frame based on rarity
const getRandomImageAndFrame = () => {
    const rarity = getRandomRarity();
    const imageFiles = fs.readdirSync(
        path.join(baseImagesPath, rarities[rarity]),
    );
    const frameFiles = fs.readdirSync(path.join(framesPath, rarities[rarity]));

    // Assuming image name format: characterName_animeName.png
    const randomImageFile =
        imageFiles[Math.floor(Math.random() * imageFiles.length)];
    const randomFrameFile =
        frameFiles[Math.floor(Math.random() * frameFiles.length)];

    // Extract the base name without the extension
    const baseName = path.parse(randomImageFile).name;

    // Find the last underscore, which separates the character name and anime name
    const lastUnderscoreIndex = baseName.lastIndexOf("_");

    // Split based on the last underscore to correctly separate characterName and animeName
    const characterName = baseName.substring(0, lastUnderscoreIndex);
    const animeName = baseName.substring(lastUnderscoreIndex + 1);

    return {
        characterName,
        animeName,
        imageFile: randomImageFile,
        frameFile: randomFrameFile,
        rarity: rarity,
    };
};

// Function to select a rarity based on probability
const getRandomRarity = () => {
    const total = Object.values(rarityChances).reduce(
        (sum, chance) => sum + chance,
        0,
    );
    const random = Math.floor(Math.random() * total);

    let sum = 0;
    for (const [rarity, chance] of Object.entries(rarityChances)) {
        sum += chance;
        if (random < sum) {
            return rarity;
        }
    }
};

module.exports = {
    name: "gacha",
    aliases: ['g', 'drop', 'd'],
    description: "Gacha pull command",
    async execute(message, args) {
        const userId = message.author.id;

        // Load cooldown data
        let cooldownData = {};
        if (fs.existsSync(cooldownPath)) {
            cooldownData = JSON.parse(fs.readFileSync(cooldownPath));
        }

        let currencyData = {};
        if (fs.existsSync(currencyPath)) {
            currencyData = JSON.parse(fs.readFileSync(currencyPath));
        }

        // Check if user has currency data, if not, initialize it
        if (!currencyData[userId]) {
            currencyData[userId] = {
                ndballs: 0,
                ddballs: 0,
                items: {
                    Egacha: 0,
                },
            };
        }

        // Load saved card data
        const data = loadData();
        if (!data[userId]) data[userId] = [];

        // Ensure that the user's currency data exists and is initialized
        if (!currencyData[userId]) {
            currencyData[userId] = {
                items: {
                    Egacha: 0, // Set default value for Gacha items
                },
            };
        }

        // Ensure that items object exists for the user
        if (!currencyData[userId].items) {
            currencyData[userId].items = {
                Egacha: 0, // Set default value for Gacha items
            };
        }

        // Ensure that Gacha property exists in the items object
        if (currencyData[userId].items.Egacha === undefined) {
            currencyData[userId].items.Egacha = 0; // Set default value for Gacha items
        }

        // Ensure directories and files exist
        ensureDirectoriesAndFilesExist();

        // Check if user is on cooldown
        const now = Date.now();

        if (
            cooldownData[userId]?.gacha &&
            now - cooldownData[userId].gacha < GACHA_COOLDOWN &&
            currencyData[userId].items.Egacha < 1
        ) {
            const timeLeft =
                GACHA_COOLDOWN - (now - cooldownData[userId].gacha);
            const minutesLeft = Math.floor(timeLeft / (1000 * 60));
            const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
            return message.reply(
                `You need to wait \`${minutesLeft} minutes\` and \`${secondsLeft} seconds\`.`,
            );
        } else if (
            cooldownData[userId]?.gacha &&
            now - cooldownData[userId].gacha < GACHA_COOLDOWN &&
            currencyData[userId].items.Egacha >= 1
        ) {
            // Check for Egacha cooldown
            if (
                cooldownData[userId]?.egacha &&
                now - cooldownData[userId].egacha < EGACHA_COOLDOWN
            ) {
                // Egacha item is still on cooldown
                const timeLeft =
                    EGACHA_COOLDOWN - (now - cooldownData[userId].egacha);
                const secondsLeft = Math.floor(timeLeft / 1000);
                return message.reply(
                    `Your Egacha item is on cooldown. Please wait \`${secondsLeft} seconds\` before using it again.`,
                );
            }

            // Egacha item used successfully, apply Egacha cooldown
            currencyData[userId].items.Egacha -= 1;
            fs.writeFileSync(
                currencyPath,
                JSON.stringify(currencyData, null, 2),
            );

            // Set Egacha cooldown
            cooldownData[userId].egacha = now;
            fs.writeFileSync(
                cooldownPath,
                JSON.stringify(cooldownData, null, 2),
            );

            await message.reply(
                `You used an Egacha item! You now have \`${currencyData[userId].items.Egacha !== undefined ? currencyData[userId].items.Egacha : "no"}\` Egacha items left.`,
            );
        }

        // Pick a random image and frame
        const selectedImageAndFrame = getRandomImageAndFrame();

        // Increment print number for the selected image and rarity
        if (!data.prints) data.prints = {};
        if (!data.prints[selectedImageAndFrame.characterName])
            data.prints[selectedImageAndFrame.characterName] = {};
        if (
            !data.prints[selectedImageAndFrame.characterName][
                selectedImageAndFrame.rarity
            ]
        ) {
            data.prints[selectedImageAndFrame.characterName][
                selectedImageAndFrame.rarity
            ] = 0;
        }
        data.prints[selectedImageAndFrame.characterName][
            selectedImageAndFrame.rarity
        ] += 1;
        const printNumber =
            data.prints[selectedImageAndFrame.characterName][
                selectedImageAndFrame.rarity
            ];

        // Generate a unique 6-character code
        const uniqueCode = generateUniqueCode();

        // Check if it's a unique card (rarity === 'unique')
        if (selectedImageAndFrame.rarity === "unique") {
            // Load the GIF from the 5star folder inside unique
            const gifPath = path.join(
                __dirname,
                "..",
                "..",
                "images",
                "5star",
                "celebration.gif",
            );

            // Send the GIF first
            const gifMessage = await message.channel.send({
                files: [{ attachment: gifPath, name: "celebration.gif" }],
            });

            // Wait for the GIF to finish (set duration, e.g., 5 seconds)
            await new Promise((resolve) => setTimeout(resolve, 5000));

            // Create canvas with an additional size for the frame
            const printText = `P${printNumber}`;
            const cardWidth = 250;
            const cardHeight = 360;
            const framePadding = 10;
            const canvasWidth = cardWidth + framePadding;
            const canvasHeight = cardHeight + framePadding;

            const canvas = createCanvas(canvasWidth, canvasHeight);
            const context = canvas.getContext("2d");

            // Load and draw the image
            const image = await loadImage(
                path.join(
                    baseImagesPath,
                    rarities[selectedImageAndFrame.rarity],
                    selectedImageAndFrame.imageFile,
                ),
            );
            context.drawImage(
                image,
                framePadding / 2,
                framePadding / 2,
                cardWidth,
                cardHeight,
            );

            // Load and draw the frame on top of the image
            const frame = await loadImage(
                path.join(
                    framesPath,
                    rarities[selectedImageAndFrame.rarity],
                    selectedImageAndFrame.frameFile,
                ),
            );
            context.drawImage(frame, 0, 0, canvasWidth, canvasHeight);

            // Function to dynamically set the font size to fit within the available width
            function setDynamicFontSize(text, maxWidth) {
                let fontSize = 28; // Start with a base font size
                context.font = `${fontSize}px "Cinzel Decorative"`;

                while (
                    context.measureText(text).width > maxWidth &&
                    fontSize > 10
                ) {
                    fontSize--; // Decrease the font size
                    context.font = `${fontSize}px "Cinzel Decorative"`;
                }

                return fontSize;
            }

            // Define the maximum width for the text area (subtract padding)
            const maxNameWidth = cardWidth - 40; // Adjust if needed

            // Adjust font size for the name text to fit within the image
            const nameFontSize = setDynamicFontSize(
                selectedImageAndFrame.characterName,
                maxNameWidth,
            );
            context.font = `${nameFontSize}px "Cinzel Decorative"`;

            // Add a shadow effect for the text
            context.shadowColor = "rgba(0, 0, 0, 0.5)"; // Shadow color (semi-transparent black)
            context.shadowBlur = 8; // Amount of blur
            context.shadowOffsetX = 2; // Horizontal shadow offset
            context.shadowOffsetY = 2; // Vertical shadow offset

            // Add a text stroke (outline)
            context.strokeStyle = "white"; // The stroke color (white)
            context.lineWidth = 4; // Stroke width

            // Draw the character name text with a stroke and fill
            const nameText = selectedImageAndFrame.characterName;
            const nameTextWidth = context.measureText(nameText).width;
            const nameX = (canvasWidth - nameTextWidth) / 2;
            const nameY = canvasHeight - 40; // Adjust the vertical position as needed
            context.strokeText(nameText, nameX, nameY); // Draw the outline (stroke)
            context.fillText(nameText, nameX, nameY); // Draw the filled text

            // Reset shadow settings to default for other elements
            context.shadowColor = "transparent"; // No shadow
            context.shadowBlur = 0;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;

            // Print number at the top left of the frame
            context.font = '25px "Cinzel Decorative""'; // Default font size for the print number
            context.strokeText(printText, 20, 38); // Draw the outline for the print number
            context.fillText(printText, 20, 38); // Draw the filled text for the print number

            // Save the generated image with a unique name
            const imagePath = path.join(
                generatedImagesPath,
                `${uniqueCode}.png`,
            );
            const buffer = canvas.toBuffer();
            fs.writeFileSync(imagePath, buffer);

            // Save card information in the user's card array
            const cardNumber = data[userId].length + 1;
            data[userId].push({
                name: selectedImageAndFrame.characterName,
                anime: selectedImageAndFrame.animeName,
                rarity: rarityEmojis[selectedImageAndFrame.rarity], // Use emoji instead of rarity name
                print: printNumber,
                numberOnList: cardNumber,
                code: uniqueCode,
            });

            // Save the updated data
            saveData(data);
            console.log(`\x1b[31m${message.author.username}\x1b[0m - \x1b[32m(${selectedImageAndFrame.characterName} || ${selectedImageAndFrame.animeName})\x1b[0m - \x1b[32m${printNumber}\x1b[0m - \x1b[32m${selectedImageAndFrame.rarity}\x1b[0m - \x1b[35m${message.guild.name}\x1b[0m`);

            // Create an embed with card details
            const cardEmbed = new EmbedBuilder()
                .setAuthor({
                    name: message.author.username,
                    iconURL: message.author.displayAvatarURL(),
                })
                .setDescription(
                    `Dropped **${selectedImageAndFrame.characterName}** from\n **${selectedImageAndFrame.animeName}**`,
                )
                .setColor("Random")
                .setImage(`attachment://${uniqueCode}.png`)
                .addFields(
                    { name: "Print:", value: `P${printNumber}`, inline: true },
                    {
                        name: "Rarity:",
                        value: rarityEmojis[selectedImageAndFrame.rarity],
                        inline: true,
                    },
                    { name: "Code:", value: uniqueCode, inline: true },
                )
                .setTimestamp();

            // Check if user is on cooldown
            if (now - (cooldownData[userId]?.gacha || 0) < GACHA_COOLDOWN) {
                // User is on cooldown
                if (currencyData[userId].items.Egacha >= 1) {
                } else {
                    // User is on cooldown and doesn't have a Gacha item
                    const timeLeft =
                        GACHA_COOLDOWN - (now - cooldownData[userId].gacha);
                }
            } else {
                // User is not on cooldown, proceed with normal drop
                // Save the current time as the last time this command was used
                if (!cooldownData[userId]) cooldownData[userId] = {};
                cooldownData[userId].gacha = now;
                fs.writeFileSync(
                    cooldownPath,
                    JSON.stringify(cooldownData, null, 2),
                );
            }

            // Edit the original message to replace the GIF with the card
            await gifMessage.edit({
                embeds: [cardEmbed],
                files: [{ attachment: imagePath, name: `${uniqueCode}.png` }],
            });
        } else {
            const printText = `P${printNumber}`;
            const cardWidth = 250;
            const cardHeight = 360;
            const framePadding = 10;
            const canvasWidth = cardWidth + framePadding;
            const canvasHeight = cardHeight + framePadding;

            const canvas = createCanvas(canvasWidth, canvasHeight);
            const context = canvas.getContext("2d");

            // Load and draw the image
            const image = await loadImage(
                path.join(
                    baseImagesPath,
                    rarities[selectedImageAndFrame.rarity],
                    selectedImageAndFrame.imageFile,
                ),
            );
            context.drawImage(
                image,
                framePadding / 2,
                framePadding / 2,
                cardWidth,
                cardHeight,
            );

            // Load and draw the frame on top of the image
            const frame = await loadImage(
                path.join(
                    framesPath,
                    rarities[selectedImageAndFrame.rarity],
                    selectedImageAndFrame.frameFile,
                ),
            );
            context.drawImage(frame, 0, 0, canvasWidth, canvasHeight);

            // Function to dynamically set the font size to fit within the available width
            function setDynamicFontSize(text, maxWidth) {
                let fontSize = 28; // Start with a base font size
                context.font = `${fontSize}px "outfit"`;

                while (
                    context.measureText(text).width > maxWidth &&
                    fontSize > 10
                ) {
                    fontSize--; // Decrease the font size
                    context.font = `${fontSize}px "outfit"`;
                }

                return fontSize;
            }

            // Define the maximum width for the text area (subtract padding)
            const maxNameWidth = cardWidth - 20; // Adjust if needed

            // Adjust font size for the name text to fit within the image
            const nameFontSize = setDynamicFontSize(
                selectedImageAndFrame.characterName,
                maxNameWidth,
            );
            context.font = `${nameFontSize}px "outfit"`;

            // Add a shadow effect for the text
            context.shadowColor = "rgba(0, 0, 0, 0.5)"; // Shadow color (semi-transparent black)
            context.shadowBlur = 8; // Amount of blur
            context.shadowOffsetX = 2; // Horizontal shadow offset
            context.shadowOffsetY = 2; // Vertical shadow offset

            // Add a text stroke (outline)
            context.strokeStyle = "white"; // The stroke color (white)
            context.lineWidth = 4; // Stroke width

            // Draw the character name text with a stroke and fill
            const nameText = selectedImageAndFrame.characterName;
            const nameTextWidth = context.measureText(nameText).width;
            const nameX = (canvasWidth - nameTextWidth) / 2;
            const nameY = canvasHeight - 40; // Adjust the vertical position as needed
            context.strokeText(nameText, nameX, nameY); // Draw the outline (stroke)
            context.fillText(nameText, nameX, nameY); // Draw the filled text

            // Reset shadow settings to default for other elements
            context.shadowColor = "transparent"; // No shadow
            context.shadowBlur = 0;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;

            // Print number at the top left of the frame
            context.font = '25px "outfit"'; // Default font size for the print number
            context.strokeText(printText, 20, 39); // Draw the outline for the print number
            context.fillText(printText, 20, 39); // Draw the filled text for the print number

            // Save the generated image with a unique name
            const imagePath = path.join(
                generatedImagesPath,
                `${uniqueCode}.png`,
            );
            const buffer = canvas.toBuffer();
            fs.writeFileSync(imagePath, buffer);

            // Save card information in the user's card array
            const cardNumber = data[userId].length + 1;
            data[userId].push({
                name: selectedImageAndFrame.characterName,
                anime: selectedImageAndFrame.animeName,
                rarity: rarityEmojis[selectedImageAndFrame.rarity], // Use emoji instead of rarity name
                print: printNumber,
                numberOnList: cardNumber,
                code: uniqueCode,
            });

            // Save the updated data
            saveData(data);
            console.log(`\x1b[31m${message.author.username}\x1b[0m - \x1b[32m(${selectedImageAndFrame.characterName} || ${selectedImageAndFrame.animeName})\x1b[0m - \x1b[32m${printNumber}\x1b[0m - \x1b[32m${selectedImageAndFrame.rarity}\x1b[0m - \x1b[35m${message.guild.name}\x1b[0m`);

            // Get current time
            const now = Date.now();

            // Check if user is on cooldown
            if (now - (cooldownData[userId]?.gacha || 0) < GACHA_COOLDOWN) {
                // User is on cooldown
                if (currencyData[userId].items.Egacha >= 1) {
                } else {
                    // User is on cooldown and doesn't have a Gacha item
                    const timeLeft =
                        GACHA_COOLDOWN - (now - cooldownData[userId].gacha);
                }
            } else {
                // User is not on cooldown, proceed with normal drop
                // Save the current time as the last time this command was used
                if (!cooldownData[userId]) cooldownData[userId] = {};
                cooldownData[userId].gacha = now;
                fs.writeFileSync(
                    cooldownPath,
                    JSON.stringify(cooldownData, null, 2),
                );
            }

            // Create an embed with card details
            const cardEmbed = new EmbedBuilder()
                .setAuthor({
                    name: message.author.username,
                    iconURL: message.author.displayAvatarURL(),
                })
                .setDescription(
                    `Dropped **${selectedImageAndFrame.characterName}** from\n **${selectedImageAndFrame.animeName}**`,
                )
                .setColor("Random")
                .setImage(`attachment://${uniqueCode}.png`)
                .addFields(
                    { name: "Print:", value: `P${printNumber}`, inline: true },
                    {
                        name: "Rarity:",
                        value: rarityEmojis[selectedImageAndFrame.rarity],
                        inline: true,
                    },
                    { name: "Code:", value: uniqueCode, inline: true },
                )
                .setTimestamp();

            // Send the card as a message with the image attached
            await message.channel.send({
                embeds: [cardEmbed],
                files: [{ attachment: imagePath, name: `${uniqueCode}.png` }],
            });
        }
    },
};