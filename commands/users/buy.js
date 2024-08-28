const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Currency structure with emojis
const currencyEmojis = {
    ndballs: "<:ndball:1274489320086048788>",
    ddballs: "<:ddball:1274489152783519754>"
};

module.exports = {
    name: "buy",
    description: "Buy an item from the shop.",
    async execute(message, args) {
        // Load shop data
        const shopPath = path.join(__dirname, "..", "..", "data", "shop.json");
        const shopData = JSON.parse(fs.readFileSync(shopPath));

        // Load currency data
        const currencyPath = path.join(__dirname, "..", "..", "data", "currency.json");
        const currencyData = JSON.parse(fs.readFileSync(currencyPath));

        const userId = message.author.id;
        const itemName = args.join(" ").toLowerCase();

        // Check if amount is specified (optional last argument) and is a valid number
        const potentialAmount = parseInt(args[args.length - 1]);
        let amount;
        if (!isNaN(potentialAmount)) {
            amount = potentialAmount;
            args.pop(); // Remove the number from the args list to get the correct item name
        } else {
            amount = 1;
        }

        const cleanItemName = args.join(" ").toLowerCase();

        // Check if user exists in currency data
        if (!currencyData[userId]) {
            return message.reply("You don't have any currency yet!");
        }

        const userCurrency = currencyData[userId];

        // Find the item in the shop by comparing item names (case-insensitive)
        const shopItems = Object.values(shopData.items);
        const item = shopItems.find(i => i.name.toLowerCase() === cleanItemName);

        if (!item) {
            return message.reply("Item not found in the shop!");
        }

        // Determine which currency is needed for the item
        const currencyType = item.currency.includes('ndball') ? 'ndballs' : 'ddballs';

        // Get the emoji for the currency
        const currencyEmoji = currencyEmojis[currencyType];

        // Calculate total cost
        const totalCost = item.cost * amount;

        // Check if the user has enough currency to buy the amount of the item
        if (userCurrency[currencyType] < totalCost) {
            return message.reply(`You don't have enough ${currencyEmoji} to buy **${amount} ${item.name}(s)**. You need ${totalCost} ${currencyEmoji}.`);
        }

        // Create confirmation embed
        const confirmationEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('Confirm Purchase')
            .setDescription(`Are you sure you want to buy **${amount} ${item.name}(s)** for **${totalCost} ${currencyEmoji}**?`)
            .setFooter({ text: 'Click yes to confirm, no to cancel.' });

        // Create buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm')
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cancel')
                    .setLabel('No')
                    .setStyle(ButtonStyle.Danger)
            );

        // Send the confirmation embed with buttons
        const sentMessage = await message.channel.send({ embeds: [confirmationEmbed], components: [row] });

        // Create a button collector to handle user's response
        const filter = i => i.user.id === userId && ['confirm', 'cancel'].includes(i.customId);
        const collector = sentMessage.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.customId === 'confirm') {
                // Deduct the total cost from the user's currency
                userCurrency[currencyType] -= totalCost;

                // Add the item to the user's inventory
                if (!userCurrency.items) {
                    userCurrency.items = {};
                }

                // If the user already has the item, increment the quantity
                if (userCurrency.items[item.name]) {
                    userCurrency.items[item.name] += amount;
                } else {
                    userCurrency.items[item.name] = amount;
                }

                // Save the updated currency data
                currencyData[userId] = userCurrency;
                fs.writeFileSync(currencyPath, JSON.stringify(currencyData, null, 2));

                // Confirmation message
                const successEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Purchase Successful')
                    .setDescription(`You have successfully purchased **${amount} ${item.name}(s)** for ${totalCost} ${currencyEmoji}.`);

                await i.update({ embeds: [successEmbed], components: [] });

            } else if (i.customId === 'cancel') {
                // Cancel the transaction
                const cancelEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Purchase Cancelled')
                    .setDescription('Your purchase has been cancelled.');

                await i.update({ embeds: [cancelEmbed], components: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Purchase Timeout')
                    .setDescription('You took too long to respond, purchase cancelled.');

                sentMessage.edit({ embeds: [timeoutEmbed], components: [] });
            }
        });
    }
};
