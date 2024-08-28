const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, Message } = require('discord.js');

// Paths to the data
const cardDataPath = path.join(__dirname, '..', '..', 'data', 'cards.json');
const currencyDataPath = path.join(__dirname, '..', '..', 'data', 'currency.json');

// Load and save data functions
const loadData = (filePath) => fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : {};
const saveData = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // Function to update card or currency data after trade
    const updateData = (userId, items, add) => {
        const cardData = loadData(cardDataPath);
        const currencyData = loadData(currencyDataPath);

        // Handle card updates
        if (items.cards) {
            items.cards.forEach(card => {
                if (add) {
                    // Add card to the user's list
                    cardData[userId] = cardData[userId] || [];
                    // Assign a list number based on the current length of the user's card list
                    card.numberOnList = cardData[userId].length + 1;
                    cardData[userId].push(card);
                } else {
                    // Remove card from the user's list by matching the card code
                    if (cardData[userId]) {
                        cardData[userId] = cardData[userId].filter(c => c.code !== card.code);
                    }
                }
            });

            // **Re-indexing the card list** - Ensure the list is ordered properly
            if (cardData[userId]) {
                cardData[userId].forEach((card, index) => {
                    card.numberOnList = index + 1;  // Re-index the list numbers (1-based index)
                });
            }
        }

        if (items.currencies) {
            items.currencies.forEach(currency => {
                if (add) {
                    if (!currencyData[userId]) {
                        currencyData[userId] = {};
                    }
                    if (!currencyData[userId][currency.currency]) {
                        currencyData[userId][currency.currency] = 0;
                    }
                    currencyData[userId][currency.currency] += currency.value;
                } else {
                    if (currencyData[userId] && currencyData[userId][currency.currency]) {
                        currencyData[userId][currency.currency] -= currency.value;

                        // Ensure the value doesn't go below 0
                        if (currencyData[userId][currency.currency] < 0) {
                            currencyData[userId][currency.currency] = 0;
                        }
                    }
                }
            });
        }

        // Save the updated data
        saveData(cardDataPath, cardData);
        saveData(currencyDataPath, currencyData);
    };



module.exports = {
    name: 'trade',
    description: 'Trade cards or currencies with another user',
    async execute(message, args) {
        const userId = message.author.id;
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) {
            return message.reply('You need to mention a user to trade with!');
        }
        const recipientId = mentionedUser.id;

        if (userId === recipientId) {
            return message.reply('You cannot trade with yourself!');
        }

        // Initialize trade data
        const tradeData = {
            initiator: { id: userId, items: { cards: [], currencies: [] }, locked: false, confirmed: false },
            recipient: { id: recipientId, items: { cards: [], currencies: [] }, locked: false, confirmed: false }
        };

        // Function to add items to trade with constraints
        const addItems = (user, items, tradeData) => {
            const isInitiator = (userId) => userId === tradeData.initiator.id;
            const userSide = isInitiator(user.id) ? 'initiator' : 'recipient';

            // Handle cards
            items.cards.forEach(card => {
                const existingCard = tradeData[userSide].items.cards.find(c => c.code === card.code);
                if (!existingCard) {
                    tradeData[userSide].items.cards.push(card);
                } else {
                    message.reply(`You have already added the card "${card.name}" with code "${card.code}".`);
                }
            });

            // Handle currencies
            items.currencies.forEach(currency => {
                const existingCurrency = tradeData[userSide].items.currencies.find(c => c.currency === currency.currency);
                if (existingCurrency) {
                    existingCurrency.value += currency.value; // Accumulate the currency value
                } else {
                    tradeData[userSide].items.currencies.push(currency);
                }
            });
        };
        
        // Function to format items into a displayable string
        const formatItems = (user, currencyEmoji) => {
            let itemList = '';

            user.items.cards.forEach(card => {
                itemList += `\`${card.print} • ${card.code} • ${card.name}\`\n`;
            });

            user.items.currencies.forEach(currency => {
                itemList += `${currency.value} ${currencyEmoji[currency.currency]}\n`;
            });

            return itemList.trim() || 'No items added';
        };

        // Function to update the trade embed
        const updateTradeEmbed = () => {
            const tradeEmbed = new EmbedBuilder()
                .setTitle('Trade in Progress')
                .setColor('Blue')
                .setDescription(`Trade between **${message.author.username}** and **${mentionedUser.username}**`)
                .addFields(
                    {
                        name: `${message.author.username}: ${tradeData.initiator.locked ? ' :lock:' : ''}${tradeData.initiator.confirmed ? ' :white_check_mark:' : ''}`,
                        value: formatItems(tradeData.initiator, { ndballs: '<:ndball:1274489320086048788>', ddballs: '<:ddball:1274489152783519754>' }),
                        inline: true
                    },
                    {
                        name: `${mentionedUser.username}: ${tradeData.recipient.locked ? ' :lock:' : ''}${tradeData.recipient.confirmed ? ' :white_check_mark:' : ''}`,
                        value: formatItems(tradeData.recipient, { ndballs: '<:ndball:1274489320086048788>', ddballs: '<:ddball:1274489152783519754>' }),
                        inline: true
                    }
                );

            return tradeEmbed;
        };

        const isInitiator = (userId) => userId === tradeData.initiator.id;

        // Initial trade offer embed
        const tradeOfferEmbed = new EmbedBuilder()
            .setTitle('Trade Offer')
            .setDescription(`**${message.author.username}** has proposed a trade with **${mentionedUser.username}**.`)
            .setColor('Blue');

        // Initial buttons for the trade offer
        const acceptButton = new ButtonBuilder()
            .setCustomId('accept_trade')
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_trade')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);

        const row1 = new ActionRowBuilder().addComponents(acceptButton, cancelButton);

        const tradeMessage = await message.channel.send({
            content: `<@${recipientId}>, ${message.author.username} wants to trade with you!`,
            embeds: [tradeOfferEmbed],
            components: [row1]
        });

        // Interaction collector for the trade proposal (30 seconds)
        const proposalFilter = (interaction) => [userId, recipientId].includes(interaction.user.id);
        const proposalCollector = tradeMessage.createMessageComponentCollector({ filter: proposalFilter, time: 30000 });

        proposalCollector.on('collect', async (interaction) => {
            if (interaction.customId === 'accept_trade') {
                if (interaction.user.id !== recipientId) {
                    return interaction.reply({ content: 'Only the mentioned user can accept the trade.', ephemeral: true });
                }

                // Trade accepted, start the 3-minute trading phase
                proposalCollector.stop(); // Stop the proposal collector

                const lockButton = new ButtonBuilder()
                    .setCustomId('lock_trade')
                    .setLabel('Lock')
                    .setStyle(ButtonStyle.Secondary);

                const cancelButton2 = new ButtonBuilder()
                    .setCustomId('cancel_trade')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger);

                const row2 = new ActionRowBuilder().addComponents(lockButton, cancelButton2);

                tradeOfferEmbed.setDescription(`Trade between **${message.author.username}** and **${mentionedUser.username}** has been accepted!`);

                await interaction.update({
                    embeds: [updateTradeEmbed()],
                    components: [row2]
                });

                // Set up a new 3-minute timer for the trade phase
                const tradeCollector = tradeMessage.createMessageComponentCollector({ filter: proposalFilter, time: 180000 });

                // Users can now add items via the message channel during the trade phase
                const messageCollector = message.channel.createMessageCollector({
                    filter: (msg) => [userId, recipientId].includes(msg.author.id),
                    time: 180000
                });

                messageCollector.on('collect', (msg) => {
                    const inputArgs = msg.content.split(',').map(item => item.trim());
                    const items = { cards: [], currencies: [] };

                    // Validate and add items to the trade
                    inputArgs.forEach(arg => {
                        const cardPattern = /^\d+$/;
                        const currencyPattern = /^(\d+)\s+(ndballs|ddballs)$/i;
                        const userCards = loadData(cardDataPath)[msg.author.id] || [];
                        const userCurrencies = loadData(currencyDataPath)[msg.author.id] || {};

                        if (cardPattern.test(arg)) {
                            const cardIndex = parseInt(arg);
                            if (cardIndex >= 1 && cardIndex <= userCards.length) {
                                const selectedCard = userCards[cardIndex - 1];
                                items.cards.push(selectedCard);
                            } else {
                                msg.reply(`Card number ${cardIndex} is out of your list's range.`);
                            }
                        } else if (currencyPattern.test(arg)) {
                            const match = arg.match(currencyPattern);
                            const currencyValue = parseInt(match[1]);
                            const currencyType = match[2].toLowerCase();

                            if (userCurrencies[currencyType] && userCurrencies[currencyType] >= currencyValue) {
                                items.currencies.push({ value: currencyValue, currency: currencyType });
                            } else {
                                msg.reply(`You do not have enough ${currencyType} to trade ${currencyValue}.`);
                            }
                        }
                    });

                    // Add items with constraints
                    const trader = isInitiator(msg.author.id) ? tradeData.initiator : tradeData.recipient;
                    addItems(msg.author, items, tradeData);

                    tradeMessage.edit({ embeds: [updateTradeEmbed(tradeData, message, mentionedUser)] });
                });
                tradeCollector.on('collect', async (tradeInteraction) => {
                    if (tradeInteraction.customId === 'cancel_trade') {
                        // Handle trade cancellation
                        tradeOfferEmbed.setDescription(`The trade between **${message.author.username}** and **${mentionedUser.username}** has been canceled.`)
                            .setColor('Red');

                        await tradeInteraction.update({
                            embeds: [tradeOfferEmbed],
                            components: []
                        });

                        tradeCollector.stop(); // Stop the trade collector
                    } else if (tradeInteraction.customId === 'lock_trade') {
                        const trader = isInitiator(tradeInteraction.user.id) ? tradeData.initiator : tradeData.recipient;

                        if (trader.locked) {
                            return tradeInteraction.reply({ content: 'You have already locked your items.', ephemeral: true });
                        }
                        
                        if (trader.items.cards.length === 0 && trader.items.currencies.length === 0) {
                            return tradeInteraction.reply({ content: 'You cannot lock the trade without adding any items.', ephemeral: true });
                        }
                        
                        trader.locked = true;

                        if (tradeData.initiator.locked && tradeData.recipient.locked) {
                            // Both users have locked their items, now show the confirm button for both
                            const confirmButton = new ButtonBuilder()
                                .setCustomId('confirm_trade')
                                .setLabel('Confirm')
                                .setStyle(ButtonStyle.Success);

                            const row3 = new ActionRowBuilder().addComponents(confirmButton, cancelButton2);

                            await tradeInteraction.update({
                                embeds: [updateTradeEmbed()],
                                components: [row3]
                            });
                        } else {
                            // Only one user has locked
                            await tradeInteraction.update({
                                embeds: [updateTradeEmbed()],
                                components: [row2]
                            });
                        }
                    } else if (tradeInteraction.customId === 'confirm_trade') {
                        const trader = isInitiator(tradeInteraction.user.id) ? tradeData.initiator : tradeData.recipient;

                        if (trader.confirmed) {
                            return tradeInteraction.reply({ content: 'You have already confirmed the trade.', ephemeral: true });
                        }

                        trader.confirmed = true;

                        // Check if both users have confirmed
                        if (tradeData.initiator.confirmed && tradeData.recipient.confirmed) {

                            // Both users have confirmed, complete the trade
                            updateData(tradeData.initiator.id, tradeData.recipient.items, true);
                            updateData(tradeData.recipient.id, tradeData.initiator.items, true);

                            updateData(tradeData.initiator.id, tradeData.initiator.items, false);
                            updateData(tradeData.recipient.id, tradeData.recipient.items, false);

                            tradeOfferEmbed.setDescription(`The trade between **${message.author.username}** and **${mentionedUser.username}** has been successfully completed!`)
                                .setColor('Green');

                            await tradeInteraction.update({
                                embeds: [tradeOfferEmbed],
                                components: []
                            });
                            messageCollector.stop(); // Stop the message collector
                            proposalCollector.stop(); 
                            tradeCollector.stop(); // Stop the collector as trade is completed
                        } else {
                            const confirmButton = new ButtonBuilder()
                            .setCustomId('confirm_trade')
                            .setLabel('Confirm')
                            .setStyle(ButtonStyle.Success);

                            const row3 = new ActionRowBuilder().addComponents(confirmButton, cancelButton2);
                            await tradeInteraction.update({
                                embeds: [updateTradeEmbed()],
                                components: [row3] // Keep the confirm button visible for both users
                            });
                        }
                    }
                });

                tradeCollector.on('end', async () => {
                    if (!tradeData.initiator.confirmed || !tradeData.recipient.confirmed) {
                        tradeOfferEmbed.setDescription(`The trade between **${message.author.username}** and **${mentionedUser.username}** has expired due to inactivity.`)
                            .setColor('Red');

                        await tradeMessage.edit({
                            embeds: [tradeOfferEmbed],
                            components: []
                        });
                        messageCollector.stop(); // Stop the message collector
                        proposalCollector.stop(); 
                        tradeCollector.stop(); // Stop the collector as trade is completed
                    }
                });
            } else if (interaction.customId === 'cancel_trade') {
                tradeOfferEmbed.setDescription(`The trade between **${message.author.username}** and **${mentionedUser.username}** has been canceled.`)
                    .setColor('Red');

                await interaction.update({
                    embeds: [tradeOfferEmbed],
                    components: []
                });

                messageCollector.stop(); // Stop the message collector
                proposalCollector.stop(); 
                tradeCollector.stop(); // Stop the collector as trade is completed
            }
        });

        proposalCollector.on('end', async () => {
            if (!proposalCollector.ended) {
                tradeOfferEmbed.setDescription(`The trade between **${message.author.username}** and **${mentionedUser.username}** has expired.`)
                    .setColor('Red');

                await tradeMessage.edit({
                    embeds: [tradeOfferEmbed],
                    components: []
                });
                messageCollector.stop(); // Stop the message collector
                proposalCollector.stop(); 
                tradeCollector.stop(); // Stop the collector as trade is completed
            }
        });
    }
};