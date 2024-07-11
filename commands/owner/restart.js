const { exec } = require('child_process');

module.exports = {
    name: 'restart',
    description: 'Restarts the bot (restricted to owner only)',
    async execute(message, args) {
        const ownerId = '944919875674071060';

        if (message.author.id !== ownerId) {
            return message.reply('You do not have permission to use this command.');
        }

        await message.reply('Bot is restarting...');

        exec('node index.js', (err, stdout, stderr) => {
            if (err) {
                console.error(`exec error: ${err}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
        });

        process.exit();
    },
};
