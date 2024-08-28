const fs = require('fs');
const path = require('path');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');

const dataPath = path.join(__dirname, '..', '..', 'data', "cards.json");

const loadData = () => {
    if (!fs.existsSync(dataPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(dataPath));
};

module.exports = {
    name: 'collection',
    aliases: ["c"],
    description: 'Show collected items or search items',
    async execute(message, args) {
        const mentionedUser = message.mentions.users.first();
        const userId = mentionedUser ? mentionedUser.id : message.author.id;
        const data = loadData();
        const userItems = data[userId];
        const user = mentionedUser || message.author;

        if (!userItems || userItems.length === 0) {
            return message.channel.send(`${user.username} has not collected any items yet.`);
        }

        // Search logic
        let searchTerm = args.join(" ").toLowerCase();
        let filteredItems = userItems;

        if (searchTerm.startsWith("c:") || searchTerm.startsWith("character:")) {
            const cardName = searchTerm.slice(2).trim();
            filteredItems = userItems.filter(item => item.name.toLowerCase().includes(cardName));
        } else if (searchTerm.startsWith("s:") || searchTerm.startsWith("source:")) {
            const cardName = searchTerm.slice(2).trim();
            filteredItems = userItems.filter(item => item.anime.toLowerCase().includes(cardName));
        } else if (searchTerm.startsWith("p:") || searchTerm.startsWith("print:")) {
            const printNumber = parseInt(searchTerm.slice(2).trim());
            filteredItems = userItems.filter(item => item.print === printNumber);
        } else if (searchTerm.startsWith("r:") || searchTerm.startsWith("rarity:")) {
            const rarity = searchTerm.slice(2).trim().toLowerCase();
            filteredItems = userItems.filter(item => item.rarity && item.rarity.toLowerCase() === rarity);
        }

        if (filteredItems.length === 0) {
            return message.channel.send(`${user.username}, No item found.`);
        }

        // Sort the filtered items by their original `numberOnList` to maintain the original order
        filteredItems.sort((b, a) => a.numberOnList - b.numberOnList);

        // Pagination logic
        const itemsPerPage = 10;
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;

            const itemsList = filteredItems.slice(start, end).map((item) => {
                const number = item.numberOnList.toString().padStart(5, ' ');
                const print = item.print.toString().padStart(5, ' ');
                const rarity = item.rarity ? item.rarity.padStart(8, ' ') : 'Unknown'; // Added rarity
                return `\`${number}\` · \`${print}#\` · ${rarity} · \`${item.code}\` · ${item.name} · **${item.anime}**`;
            }).join('\n');

            return new EmbedBuilder()
                .setAuthor({ name: `${user.username}`, iconURL: `${user.displayAvatarURL()}` })
                .setDescription(itemsList)
                .setFooter({ text: `Page ${page + 1} of ${totalPages} · Total: ${filteredItems.length}` });
        };

        const embedMessage = await message.channel.send({
            embeds: [generateEmbed(currentPage)],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('Previous')
                    .setStyle('Primary')
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle('Primary')
                    .setDisabled(currentPage === totalPages - 1)
            )]
        });

        const filter = i => i.user.id === message.author.id;
        const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'prev') {
                if (currentPage > 0) {
                    currentPage--;
                    await i.update({
                        embeds: [generateEmbed(currentPage)],
                        components: [new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev')
                                .setLabel('Previous')
                                .setStyle('Primary')
                                .setDisabled(currentPage === 0),
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('Next')
                                .setStyle('Primary')
                                .setDisabled(currentPage === totalPages - 1)
                        )]
                    });
                }
            } else if (i.customId === 'next') {
                if (currentPage < totalPages - 1) {
                    currentPage++;
                    await i.update({
                        embeds: [generateEmbed(currentPage)],
                        components: [new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev')
                                .setLabel('Previous')
                                .setStyle('Primary')
                                .setDisabled(currentPage === 0),
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('Next')
                                .setStyle('Primary')
                                .setDisabled(currentPage === totalPages - 1)
                        )]
                    });
                }
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                embedMessage.edit({ components: [] });
            }
        });
    },
};
