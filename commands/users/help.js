const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Shows a list of all commands or detailed information about a specific command.',
    usage: '.help [command name]',
    async execute(message, args) {
        const { commands, commandCategories } = message.client;

        if (!args.length) {
            // List all commands
            const embed = new EmbedBuilder()
                .setTitle('Command List')
                .setColor('#0099ff')
                .setDescription('Here are all the available commands:')
                .setFooter({ text: 'Bot made by: goldenbroly | Use .help [command name] for detailed information.' })

                // Sorting command categories alphabetically
                const sortedCategories = Array.from(commandCategories.keys()).sort();

                sortedCategories.forEach(category => {
                    const commandNames = commandCategories.get(category).sort(); // Sort commands within each category alphabetically
                    const formattedCommands = commandNames.map(commandName => `\`${commandName}\``).join(' | ');
                    embed.addFields({ name: category || 'General', value: formattedCommands });
                })

            return message.channel.send({ embeds: [embed] });
        } else {
            // Show detailed information about a specific command
            const name = args[0].toLowerCase();
            const command = commands.get(name) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(name));

            if (!command) {
                return message.reply('That command does not exist.');
            }

            const embed = new EmbedBuilder()
                .setTitle(`Command: ${command.name}`)
                .setColor('#0099ff')
                .addFields(
                    { name: 'Description', value: command.description || 'No description provided.' },
                    { name: 'Usage', value: command.usage || `.${command.name}` },
                    { name: 'Aliases', value: command.aliases ? command.aliases.map(alias => `\`${alias}\``).join(', ') : 'None' }
                );

            return message.channel.send({ embeds: [embed] });
        }
    },
};
