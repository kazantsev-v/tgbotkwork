const { EntitySchema } = require('typeorm');

const NotificationChatSchema = new EntitySchema({
    name: "NotificationChat",
    tableName: "notification_chat",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true
        },
        chatId: {
            type: "varchar",
            unique: true
        },
        chatTitle: {
            type: "varchar"
        },
        chatType: {
            type: "varchar"
        },
        active: {
            type: "boolean",
            default: true
        },
        createdAt: {
            type: "datetime",
            createDate: true
        }
    }
});

module.exports = { NotificationChatSchema };