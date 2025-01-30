"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const task_1 = require("../entities/task");
const review_1 = require("../entities/review");
const router = (0, express_1.Router)();
const reviewRepo = database_1.AppDataSource.getRepository(review_1.Review);
const taskRepo = database_1.AppDataSource.getRepository(task_1.Task);
router.get("/", async (req, res) => {
    try {
        const reviews = await reviewRepo.find({ relations: ["task"] });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving reviews", error });
    }
});
router.get("/getByTaskId/:taskId", async (req, res) => {
    const { taskId } = req.params;
    try {
        const reviews = await reviewRepo.find({
            where: { task: { id: Number(taskId) } },
            relations: ["task"]
        });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving reviews", error });
    }
});
router.get("/getByCreatorId/:creatorId", async (req, res) => {
    const { creatorId } = req.params;
    try {
        const reviews = await reviewRepo.find({
            where: { task: { creator: { id: Number(creatorId) } } },
            relations: ["task"]
        });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving reviews", error });
    }
});
router.get("/getByExecutorId/:executorId", async (req, res) => {
    const { executorId } = req.params;
    try {
        const reviews = await reviewRepo.find({
            where: { task: { executor: { id: Number(executorId) } } },
            relations: ["task"]
        });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving reviews", error });
    }
});
router.get("/:reviewId", async (req, res) => {
    const { reviewId } = req.params;
    try {
        const reviews = await reviewRepo.find({
            where: { id: Number(reviewId) },
            relations: ["task"]
        });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving reviews", error });
    }
});
router.post("/", async (req, res) => {
    try {
        const reqreview = req.body;
        const task = await taskRepo.findOne({
            where: { id: Number(reqreview.task.id) },
            relations: ["creator", "executor", "moderator"]
        });
        if (task) {
            reqreview.task = task;
            const review = reviewRepo.create(reqreview);
            const savedReview = await reviewRepo.save(review);
        }
        else
            res.status(500).json({ message: "Error retrieving reviews" });
        ;
        const reviews = await reviewRepo.find({ relations: ["task"] });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving reviews", error });
    }
});
exports.default = router;
