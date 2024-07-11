const fs = require('fs');
const path = require('path');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');

const dataPath = path.join(__dirname, '..', '..', 'data', "users.json");

const loadData = () => {
    if (!fs.existsSync(dataPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(dataPath));
};

module.exports = {
    name: 'inventory',
    aliases: ["inv"],
    description: 'Show collected items',
    async execute(message, args) {
        const mentionedUser = message.mentions.users.first();
        const userId = mentionedUser ? mentionedUser.id : message.author.id;
        const data = loadData();
        const userItems = data[userId];
        const user = mentionedUser || message.author;

        if (!userItems || userItems.length === 0) {
            return message.channel.send(`${user.username} has not collected any items yet.`);
        }
        userItems.reverse();
        const itemsPerPage = 10;
        const totalPages = Math.ceil(userItems.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const totalItems = userItems.length;

            const itemsList = userItems.slice(start, end).map((item, index) => {
                const number = (totalItems - (start + index)).toString().padStart(5, ' ');
                const print = item.print.toString().padStart(5, ' ');
                return `\`${number}\` · \`${print}\` · \`${item.code}\` · **${item.name}**`;
            }).join('\n');

            return new EmbedBuilder()
                .setAuthor({ name: `${user.username}`, iconURL: `${user.displayAvatarURL()}` })
                .setTitle(`${user.username}'s Inventory`)
                .setDescription(itemsList)
                .setFooter({ text: `Page ${page + 1} of ${totalPages} · Total : ${userItems.length}` });
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
