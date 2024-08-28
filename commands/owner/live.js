const ownerId = process.env.ownerId;

module.exports = {
    name: 'live',
    description: 'Shows how long the bot has been online.',
    async execute(message) {
        // Calculate uptime
        const totalSeconds = process.uptime();
        const days = Math.floor(totalSeconds / (24 * 60 * 60));
        const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        if (message.author.id !== ownerId) {
            return message.reply('Command only for bot Owner.');
        }
        
        // Format uptime message
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // Reply with the uptime
        message.channel.send(`I have been online for: \`${uptimeString}\`.`);
    },
};
