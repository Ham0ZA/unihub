const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', '..', 'data', 'cards.json');
const generatedImagesPath = path.join(__dirname, '..', '..', 'generated_images');

const loadData = () => {
    if (!fs.existsSync(dataPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(dataPath));
};

const saveData = (data) => {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

module.exports = {
    name: 'gift',
    description: 'Gift an item to another user',
    async execute(message, args) {
        const mentionedUser = message.mentions.users.first();
        const itemIdentifier = args[1];

        if (!mentionedUser) {
            return message.channel.send('Please mention a user to gift the item to.');
        }

        if (!itemIdentifier) {
            return message.channel.send('Please provide the item code or number to gift.');
        }

        const data = loadData();
        const userId = message.author.id;
        const userItems = data[userId];

        if (!userItems || userItems.length === 0) {
            return message.channel.send('You do not have any items to gift.');
        }

        let item;
        if (isNaN(itemIdentifier)) {
            // Item identifier is a code
            item = userItems.find(item => item.code === itemIdentifier);
        } else {
            // Item identifier is a number
            const itemIndex = parseInt(itemIdentifier) - 1;
            if (itemIndex >= 0 && itemIndex < userItems.length) {
                item = userItems[itemIndex];
            }
        }

        if (!item) {
            return message.channel.send('You do not have an item with that code or number.');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('accept')
                .setLabel('Accept')
                .setStyle('3'),
            new ButtonBuilder()
                .setCustomId('decline')
                .setLabel('Decline')
                .setStyle('4'),
            new ButtonBuilder()
                .setCustomId('cancel')
                .setLabel('Cancel')
                .setStyle('2')
        );

        const embed = new EmbedBuilder()
            .setDescription(`A gift from ${message.author.username}.\n\n**Item Name:** \`${item.name}\`\n**Print Number:** \`${item.print}\`\n**Code:** \`${item.code}\``)
            .setImage(`attachment://${item.code}.png`)
            .setFooter({ text: `Number on List: ${item.numberOnList}` });

        const imagePath = path.join(generatedImagesPath, `${item.code}.png`);

        const giftMessage = await message.channel.send({
            content: `${mentionedUser}, do you accept this gift?`,
            embeds: [embed],
            components: [row],
            files: [{ attachment: imagePath, name: `${item.code}.png` }]
        });

        const filter = interaction => {
            if ((interaction.customId === 'cancel' ) && interaction.user.id === message.author.id) {
                return true;
            }
            if ((interaction.customId === 'accept' || interaction.customId === 'decline') && interaction.user.id === mentionedUser.id) {
                return true;
            }
            interaction.reply({ content: 'You cannot press this button.', ephemeral: true });
            return false;
        };

        const collector = giftMessage.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'accept') {
                if (!data[mentionedUser.id]) data[mentionedUser.id] = [];
                data[mentionedUser.id].push(item);
                data[userId] = userItems.filter(i => i.code !== item.code);
                saveData(data);
                await i.update({ content: `${mentionedUser} accepted the gift!`, components: [] });
            } else if (i.customId === 'decline') {
                await i.update({ content: `${mentionedUser} declined the gift.`, components: [] });
            } else if (i.customId === 'cancel') {
                await i.update({ content: `<@${message.author.id}> cancelled the gift.`, components: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                giftMessage.edit({ components: [] });
            }
        });
    },
};
