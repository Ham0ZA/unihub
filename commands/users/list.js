const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const currentTime = Date.now(); // Current time in milliseconds

// Paths to the currency data
const currencyPath = path.join(__dirname, '..', '..', 'data', 'currency.json');

// Ensure that the currency file exists
const ensureCurrencyFileExists = () => {
    if (!fs.existsSync(currencyPath)) {
        fs.writeFileSync(currencyPath, JSON.stringify({}));
    }
};

// Load the currency data
const loadCurrencyData = () => {
    if (!fs.existsSync(currencyPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(currencyPath));
};

// Map item names to emojis
const itemEmojis = {
    "Booster Pack": "🎁", // Example emoji for Booster Pack
    "Egacha": "🎰", // Example emoji for Egacha
    "Half Gacha": "⏳", // Example emoji for HalfGacha
    "fstar": "✨"
};

module.exports = {
    name: 'list',
    description: 'View your currencies or another user\'s currencies by mentioning them or using their ID',
    async execute(message, args) {
        const targetUser = message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user || message.author;
        const targetUserId = targetUser.id;

        // Ensure that the currency file exists
        ensureCurrencyFileExists();

        // Load the currency data
        const currencyData = loadCurrencyData();

        // If the target user has no currency data, initialize their wallet
        if (!currencyData[targetUserId]) {
            currencyData[targetUserId] = {
                ndballs: 0,
                ddballs: 0,
                items: {}
            };
        }

        const userCurrency = currencyData[targetUserId];

        // Calculate cooldown time if it exists
        let cooldownMessage = "";
        if (userCurrency.items.HalfGacha) {
            const cooldownEnd = userCurrency.items.HalfGacha;
            const timeLeft = cooldownEnd - currentTime;

            if (timeLeft > 0) {
                const daysLeft = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
                const hoursLeft = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
                const secondsLeft = Math.floor((timeLeft % (60 * 1000)) / 1000);

                if (daysLeft > 0) {
                    cooldownMessage = `**Cooldowns:**\n⏳ Half Gacha: \`${daysLeft} days\``;
                } else if (hoursLeft > 0) {
                    cooldownMessage = `**Cooldowns:**\n⏳ Half Gacha: \`${hoursLeft} hours\``;
                } else if (minutesLeft > 0) {
                    cooldownMessage = `**Cooldowns:**\n⏳ Half Gacha: \`${minutesLeft} minutes\``;
                } else {
                    cooldownMessage = `**Cooldowns:**\n⏳ Half Gacha: \`${secondsLeft} seconds\``;
                }
            } else {
                cooldownMessage = "No cooldown active.";
            }
        } else {
            cooldownMessage = "No cooldown active.";
        }

        // Prepare the items list (if any), excluding 'halfDropCooldown', and filter out items with a value of 0
        let itemsList = "";
        if (userCurrency.items && Object.keys(userCurrency.items).length > 0) {
            const filteredItems = Object.entries(userCurrency.items)
                .filter(([itemName, quantity]) => itemName !== 'HalfGacha' && quantity > 0) // Exclude 'halfDropCooldown'
                .map(([itemName, quantity]) => {
                    // Add emoji if it exists in the itemEmojis map
                    const emoji = itemEmojis[itemName] || "";
                    return `${emoji} ${itemName}: **${quantity}**`;
                })
                .join('\n');

            itemsList = filteredItems ? `**Items:**\n${filteredItems}` : "No items owned.";
        } else {
            itemsList = "No items owned.";
        }

        // Add the cooldown message separately
        itemsList += `\n\n${cooldownMessage}`;

        // Prepare the embed message showing the target user's currencies and items
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${targetUser.username}'s Wallet`, iconURL: targetUser.displayAvatarURL() })
            .setColor('Blue')
            .setDescription(`\n`
                + `<:ndball:1274489320086048788> ndballs ‣ **${userCurrency.ndballs}** \n`
                + `<:ddball:1274489152783519754> ddballs ‣ **${userCurrency.ddballs}** \n\n`
                + `${itemsList}`)
            .setFooter({ text: `Checked by ${message.author.username}` });

        // Send the embed to the user
        await message.channel.send({ embeds: [embed] });
    },
};
