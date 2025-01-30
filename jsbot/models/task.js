class Task {
    constructor(
        id,
        creator,
        executor = null,
        moderator = null,
        title,
        description,
        location,
        payment,
        packNeeded = false,
        toolNeeded = false,
        assembleNeeded = false,
        packDescription = null,
        toolDescription = null,
        assembleDescription = null,
        moderatorDescription = null,
        status = "pending",
        createdAt = new Date(),
        dates = [],
        duration = null,
        priority = 0,
        startTime = null,
    ) {
        this.id = id;
        this.creator = creator;
        this.executor = executor;
        this.moderator = moderator;
        this.title = title;
        this.description = description;
        this.location = location;
        this.payment = payment;
        this.pack_needed = packNeeded;
        this.tool_needed = toolNeeded;
        this.assemble_needed = assembleNeeded;
        this.pack_description = packDescription;
        this.tool_description = toolDescription;
        this.assemble_description = assembleDescription;
        this.moderator_description = moderatorDescription;
        this.status = status;
        this.createdAt = createdAt;
        this.dates = dates || [];
        this.duration = duration;
        this.priority = priority
        this.start_time = startTime;
    }
}

class TaskPhoto {
    constructor(id, taskId, photoUrl) {
        this.id = id;
        this.taskId = taskId;
        this.photoUrl = photoUrl;
    }
}

module.exports = { 
    Task, 
    TaskPhoto 
};
