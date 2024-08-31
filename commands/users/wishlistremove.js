const {  ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const prefix = require('./../../index.js');
const { aliases } = require('./collection.js');

// Paths for data files
const wishlistPath = path.join(__dirname, '..', '..', 'data', 'wishlist.json');

// Load wishlist data from JSON
const loadWishlistData = () => {
    if (!fs.existsSync(wishlistPath)) {
        return { cards: [], users: {} };
    }
    return JSON.parse(fs.readFileSync(wishlistPath));
};

// Save wishlist data to JSON
const saveWishlistData = (data) => {
    try {
        fs.writeFileSync(wishlistPath, JSON.stringify(data, null, 2));
        console.log(`Saved wishlist data to ${wishlistPath}`);
    } catch (err) {
        console.error('Error saving wishlist data:', err);
    }
};

// Find card by partial name
const findCardsByName = (name, cards) => {
    return cards.filter(card => card.toLowerCase().includes(name.toLowerCase()));
};

module.exports = {
    name: 'wishlistremove',
    aliases: ['wr'],
    description: 'Remove a card from your wishlist',
    usage: `${prefix}wishlistremove [partial card name]`,
    async execute(message, args) {
        const partialCardName = args.join(' ');
        if (!partialCardName) {
            return message.reply('Please provide a partial name of the card you want to remove from your wishlist.');
        }

        const userId = message.author.id;
        const wishlistData = loadWishlistData();

        // Find matching cards in user's wishlist
        const userWishlist = wishlistData.users[userId] || [];
        const matchingCards = findCardsByName(partialCardName, userWishlist);

        if (matchingCards.length === 0) {
            return message.reply(`No card matching "${partialCardName}" was found in your wishlist.`);
        }

        if (matchingCards.length === 1) {
            // If there's only one match, remove it directly
            const cardName = matchingCards[0];
            const cardIndex = userWishlist.indexOf(cardName);
            userWishlist.splice(cardIndex, 1);
            wishlistData.users[userId] = userWishlist;

            // Update global wishlist count
            const globalCard = wishlistData.cards.find(card => card.name === cardName);
            if (globalCard) {
                globalCard.wishlistCount -= 1;
                if (globalCard.wishlistCount <= 0) {
                    wishlistData.cards = wishlistData.cards.filter(card => card.name !== cardName);
                }
            }

            saveWishlistData(wishlistData);
            await message.reply(`Removed **${cardName}** from your wishlist.`);
        } else {
            // If there are multiple matches, prompt user to choose using a dropdown menu
            const options = matchingCards.map((cardName, index) => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(cardName)
                    .setValue(`remove_${index}`)
            );

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_card')
                        .setPlaceholder('Select a card to remove')
                        .addOptions(options)
                );


            const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`Multiple cards found. Please select the one to remove`)
            
            const promptMessage = await message.reply({
                embeds: [embed],
                components: [row]
            });

            const filter = i => i.user.id === userId && i.customId === 'select_card';
            const collector = promptMessage.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (interaction) => {
                const index = parseInt(interaction.values[0].split('_')[1], 10);
                const cardName = matchingCards[index];

                const cardIndex = userWishlist.indexOf(cardName);
                userWishlist.splice(cardIndex, 1);
                wishlistData.users[userId] = userWishlist;

                // Update global wishlist count
                const globalCard = wishlistData.cards.find(card => card.name === cardName);
                if (globalCard) {
                    globalCard.wishlistCount -= 1;
                    if (globalCard.wishlistCount <= 0) {
                        wishlistData.cards = wishlistData.cards.filter(card => card.name !== cardName);
                    }
                }

                saveWishlistData(wishlistData);
                await interaction.reply(`Removed **${cardName}** from your wishlist.`);
                collector.stop();
            });

            collector.on('end', async () => {
                await promptMessage.edit({ components: [] });
            });
        }
    }
};
