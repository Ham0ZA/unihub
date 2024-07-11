module.exports = {
    name: 'invite',
    description: 'Get the invite link to add the bot to your server',
    async execute(message, args) {

        const inviteURL = `https://discord.com/oauth2/authorize?client_id=1253456941150113845`;

        const embed = {
            color: 0x0099ff,
            title: `Invite Me!`,
            URL: inviteURL,
        };

        message.channel.send({ embeds: [embed] });
    },
};
