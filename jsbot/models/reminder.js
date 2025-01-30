class Reminder {
    constructor(
        id, 
        user, 
        message = '',
        remindAt = (new Date()).getDate() + 3,
        status = 'pending',
        createdAt = new Date(),
    ) {
        this.id = id;
        this.user = user;
        this.message = message;
        this.remindAt = remindAt;
        this.status = status;
        this.createdAt = createdAt;
    }
}

module.exports = { 
    Reminder 
};

