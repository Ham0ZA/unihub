const { exec } = require('child_process');
const ownerId = process.env.ownerId;

module.exports = {
    name: 'restart',
    aliases: ["r"],
    description: 'Restarts the bot (restricted to owner only)',
    async execute(message, args) {

        if (message.author.id !== ownerId) {
            return message.reply('Command only for bot Owner.');
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
