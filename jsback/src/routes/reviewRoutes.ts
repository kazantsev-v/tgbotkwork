import { Router } from "express";
import { AppDataSource } from "../database";
import { Task } from "../entities/task";
import { Review } from "../entities/review";

const router = Router();
const reviewRepo = AppDataSource.getRepository(Review);
const taskRepo = AppDataSource.getRepository(Task);

router.get("/", async (req, res) => {
    try {
        const reviews = await reviewRepo.find({ relations: ["task"] });
        res.json(reviews);
    } catch (error) {
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
    } catch (error) {
        res.status(500).json({ message: "Error retrieving reviews", error });
    }
});

router.get("/getByCreatorId/:creatorId", async (req, res) => {
    const { creatorId } = req.params;
    try {
        const reviews = await reviewRepo.find({ 
            where: { task: { creator: { id: Number(creatorId) }} },
            relations: ["task"] 
        });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving reviews", error });
    }
});

router.get("/getByExecutorId/:executorId", async (req, res) => {
    const { executorId } = req.params;
    try {
        const reviews = await reviewRepo.find({ 
            where: { task: { executor: { id: Number(executorId) }} },
            relations: ["task"] 
        });
        res.json(reviews);
    } catch (error) {
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
    } catch (error) {
        res.status(500).json({ message: "Error retrieving reviews", error });
    }
});

router.post("/", async (req, res) => {
    try {
        const reqreview: Review = req.body;
        const task = await taskRepo.findOne(
            { 
                where: {id: Number(reqreview.task.id)},
                relations: ["creator", "executor", "moderator"] 
            }
        );
        if (task) {
            reqreview.task = task;
            const review = reviewRepo.create(reqreview);
            const savedReview = await reviewRepo.save(review);
        }
        else 
            res.status(500).json({ message: "Error retrieving reviews" });;
        const reviews = await reviewRepo.find({ relations: ["task"] });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving reviews", error });
    }
});

export default router;