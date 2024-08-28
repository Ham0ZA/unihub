const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

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

        // Prepare the items list (if any) and filter out items with a value of 0
        let itemsList = "";
        if (userCurrency.items && Object.keys(userCurrency.items).length > 0) {
            const filteredItems = Object.entries(userCurrency.items)
                .filter(([itemName, quantity]) => quantity > 0)
                .map(([itemName, quantity]) => `${itemName}: **${quantity}**`)
                .join('\n');

            itemsList = filteredItems ? `**Items:**\n${filteredItems}` : "No items owned.";
        } else {
            itemsList = "No items owned.";
        }

        // Prepare the embed message showing the target user's currencies and items
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${targetUser.username}'s Wallet`, iconURL: targetUser.displayAvatarURL() })
            .setColor('Blue')
            .setDescription(`\n`
                + `<:ndball:1274489320086048788>: **${userCurrency.ndballs}** ‣ ndballs\n`
                + `<:ddball:1274489152783519754>: **${userCurrency.ddballs}** ‣ ddballs\n\n`
                + `${itemsList}`)
            .setFooter({ text: `Checked by ${message.author.username}` })
            .setTimestamp();

        // Send the embed to the user
        await message.channel.send({ embeds: [embed] });
    },
};
